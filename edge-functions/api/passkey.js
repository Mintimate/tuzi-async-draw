/*!
 * Tuzi Async Studio - Passkey Edge Function (无外部依赖版本)
 * (c) 2025-present Mintimate
 * Released under the MIT License.
 *
 * 使用 EdgeOne Pages KV 存储 Passkey 凭证与临时 Challenge
 * KV 命名空间需要在 EdgeOne Pages 控制台绑定，变量名：TUZI_KV
 *
 * 存储结构（简述）：
 * - passkey:user:{userId}          - 用户信息（包含 token、credential 列表、以及当前活跃的 challenge 指针）
 * - passkey:credential:{credId}    - 凭证信息（公钥、计数器、创建时间等）
 * - passkey:challenge:{challengeId}- 临时 challenge 存储（用于注册/认证/管理令牌流程，带 TTL）
 *
 * 重要设计说明：
 * - Challenge 有 TTL（默认 5 分钟）作为兜底，但在前端中断或重试时，单纯依赖 TTL 会导致短时间内 KV 中残留脏数据。
 * - 为确保每个用户只保留一个活跃 challenge，服务端会在保存 challenge 时在对应用户对象上记录 `currentChallengeId`，
 *   并在生成新的 challenge 或消费（验证）时进行同步清理。这样能避免临时 key 在 KV 中堆积，同时无需列出 KV 键或依赖额外的清理任务。
 *
 * 注意：本版本使用原生 Web Crypto API，不依赖 @simplewebauthn/server
 */

const VERSION = '1.0.3'; // 1.0.3: add cancelChallenge action

// 响应码
const RES_CODE = {
  SUCCESS: 0,
  FAIL: 1000,
  NOT_FOUND: 1404
};

// RP 配置 - 从请求中动态获取
function getRPConfig(request) {
  const url = new URL(request.url);
  const origin = request.headers.get('origin') || `${url.protocol}//${url.host}`;
  const rpID = url.hostname === 'localhost' ? 'localhost' : url.hostname;
  
  return {
    rpName: 'Tuzi Async Studio',
    rpID,
    origin
  };
}

/**
 * EdgeOne Pages Edge Function 入口
 */
export async function onRequest(context) {
  const { request } = context;
  
  // 处理 CORS 预检请求
  if (request.method === 'OPTIONS') {
    return handleCors(request);
  }
  
  // GET 请求返回版本信息
  if (request.method !== 'POST') {
    return new Response(JSON.stringify({
      code: RES_CODE.SUCCESS,
      message: 'Tuzi Passkey API 运行正常',
      version: VERSION
    }), {
      headers: getCorsHeaders(request)
    });
  }

  let res = {};
  
  try {
    const body = await request.json();
    const { action, data } = body;
    
    // 验证 KV 存储是否可用
    if (typeof TUZI_KV === 'undefined') {
      throw new Error('未配置 TUZI_KV 命名空间，请在 EdgeOne Pages 控制台绑定 KV 存储');
    }
    
    const rpConfig = getRPConfig(request);
    
    switch (action) {
      case 'generateRegistrationOptions':
        res = await handleGenerateRegistrationOptions(data, rpConfig);
        break;
      case 'verifyRegistration':
        res = await handleVerifyRegistration(data, rpConfig);
        break;
      case 'generateAuthenticationOptions':
        res = await handleGenerateAuthenticationOptions(data, rpConfig);
        break;
      case 'verifyAuthentication':
        res = await handleVerifyAuthentication(data, rpConfig);
        break;
      case 'generateManagementToken':
        res = await handleGenerateManagementToken(data, rpConfig);
        break;
      case 'listCredentials':
        res = await handleListCredentials(data);
        break;
      case 'deleteCredential':
        res = await handleDeleteCredential(data);
        break;
      case 'cancelChallenge':
        res = await handleCancelChallenge(data);
        break;
      default:
        res = { code: RES_CODE.FAIL, message: '未知操作' };
    }
  } catch (e) {
    console.error('Passkey 操作错误：', e.message, e.stack);
    res = { code: RES_CODE.FAIL, message: `Passkey Error: ${e.message}` };
  }
  
  return new Response(JSON.stringify(res), {
    headers: getCorsHeaders(request)
  });
}

// ==================== CORS 处理 ====================

function handleCors(request) {
  return new Response(null, {
    status: 204,
    headers: getCorsHeaders(request)
  });
}

function getCorsHeaders(request) {
  const origin = request.headers.get('origin') || '*';
  return {
    'Content-Type': 'application/json; charset=UTF-8',
    'Access-Control-Allow-Origin': origin,
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Access-Control-Max-Age': '600'
  };
}

// ==================== 工具函数 ====================

function generateUUID() {
  if (typeof crypto !== 'undefined' && crypto.randomUUID) {
    return crypto.randomUUID().replace(/-/g, '');
  }
  if (typeof crypto !== 'undefined' && crypto.getRandomValues) {
    const bytes = new Uint8Array(16);
    crypto.getRandomValues(bytes);
    bytes[6] = (bytes[6] & 0x0f) | 0x40;
    bytes[8] = (bytes[8] & 0x3f) | 0x80;
    return Array.from(bytes).map(b => b.toString(16).padStart(2, '0')).join('');
  }
  return 'xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx'.replace(/[x]/g, () => {
    return (Math.random() * 16 | 0).toString(16);
  });
}

// Base64URL 编解码
function base64URLEncode(buffer) {
  const bytes = new Uint8Array(buffer);
  let binary = '';
  for (let i = 0; i < bytes.length; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return btoa(binary).replace(/\+/g, '-').replace(/\//g, '_').replace(/=/g, '');
}

function base64URLDecode(base64url) {
  const base64 = base64url.replace(/-/g, '+').replace(/_/g, '/');
  const padding = base64.length % 4 === 0 ? '' : '='.repeat(4 - (base64.length % 4));
  const binary = atob(base64 + padding);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) {
    bytes[i] = binary.charCodeAt(i);
  }
  return bytes;
}

// ==================== KV 操作封装 ====================

async function kvGet(key) {
  const data = await TUZI_KV.get(key);
  return data ? JSON.parse(data) : null;
}

async function kvSet(key, value, options = {}) {
  await TUZI_KV.put(key, JSON.stringify(value), options);
}

async function kvDelete(key) {
  await TUZI_KV.delete(key);
}

// ==================== 用户相关操作 ====================

async function getUser(userId) {
  return await kvGet(`passkey:user:${userId}`);
}

async function saveUser(user) {
  await kvSet(`passkey:user:${user.id}`, user);
}

async function getUserByCredentialId(credentialId) {
  const credential = await kvGet(`passkey:credential:${credentialId}`);
  if (!credential) return null;
  return await getUser(credential.userId);
}

// ==================== 凭证相关操作 ====================

async function getCredential(credentialId) {
  return await kvGet(`passkey:credential:${credentialId}`);
}

async function saveCredential(credential) {
  await kvSet(`passkey:credential:${credential.id}`, credential);
  
  // 更新用户的凭证列表
  const user = await getUser(credential.userId);
  if (user) {
    if (!user.credentialIds) {
      user.credentialIds = [];
    }
    if (!user.credentialIds.includes(credential.id)) {
      user.credentialIds.push(credential.id);
      await saveUser(user);
    }
  }
}

async function getUserCredentials(userId) {
  const user = await getUser(userId);
  if (!user || !user.credentialIds) return [];
  
  const credentials = [];
  for (const credId of user.credentialIds) {
    const cred = await getCredential(credId);
    if (cred) {
      credentials.push(cred);
    }
  }
  return credentials;
}

async function deleteCredential(credentialId) {
  const credential = await getCredential(credentialId);
  if (!credential) return false;
  
  // 从用户凭证列表中移除
  const user = await getUser(credential.userId);
  if (user && user.credentialIds) {
    user.credentialIds = user.credentialIds.filter(id => id !== credentialId);
    await saveUser(user);
  }
  
  await kvDelete(`passkey:credential:${credentialId}`);
  return true;
}

// ==================== Challenge 管理 ====================

async function saveChallenge(challengeId, data) {
  // Challenge 有效期 5 分钟
  await kvSet(`passkey:challenge:${challengeId}`, {
    ...data,
    createdAt: Date.now()
  }, { expirationTtl: 300 });
}

/**
 * 获取并删除一个 challenge，同时清理任何与之关联的用户指针（`currentChallengeId`）。
 * 说明：
 * - 在验证流程中（verifyRegistration / verifyAuthentication / generateManagementToken），我们会调用此函数以一次性消费 challenge。
 * - 如果该 challenge 与用户相关联（保存时记录了 userId），则会额外清理用户对象上保存的 `currentChallengeId`，避免过期或中断操作后用户对象仍指向已删除的 challenge。
 * - 清理失败不会阻止验证主流程，但会记录日志以便排查。
 */
async function getAndDeleteChallenge(challengeId) {
  const data = await kvGet(`passkey:challenge:${challengeId}`);
  if (data) {
    await kvDelete(`passkey:challenge:${challengeId}`);

    // 如果该 challenge 与用户相关，清理用户对象上的指针
    if (data.userId) {
      try {
        const user = await getUser(data.userId);
        if (user && user.currentChallengeId === challengeId) {
          delete user.currentChallengeId;
          await saveUser(user);
        }
      } catch (e) {
        console.error('getAndDeleteChallenge cleanup error:', e);
        // 清理失败不影响主流程
      }
    }
  }
  return data;
}

// ==================== 管理令牌 ====================

async function saveManagementToken(tokenId, userId) {
  // 管理令牌有效期 5 分钟
  await kvSet(`passkey:mgmt_token:${tokenId}`, {
    userId,
    createdAt: Date.now()
  }, { expirationTtl: 300 });
}

async function validateManagementToken(tokenId, expectedUserId) {
  const data = await kvGet(`passkey:mgmt_token:${tokenId}`);
  if (!data) return false;
  return data.userId === expectedUserId;
}

// ==================== 注册流程 ====================

async function handleGenerateRegistrationOptions(data, rpConfig) {
  const { username, token } = data;
  
  if (!username || !token) {
    return { code: RES_CODE.FAIL, message: '用户名和 Token 不能为空' };
  }
  
  // 生成用户 ID
  const userId = await generateUserIdFromUsername(username);
  
  // 获取用户现有凭证
  let user = await getUser(userId);
  
  // 清理旧 Challenge，防止脏数据堆积
  if (user && user.currentChallengeId) {
    await kvDelete(`passkey:challenge:${user.currentChallengeId}`);
  }
  
  if (user) {
    // 更新用户 token
    user.token = token;
    user.updatedAt = Date.now();
    // 注意：此处不再预先删除凭证，改为在 verifyRegistration 成功后清理
  } else {
    // 创建新用户
    user = {
      id: userId,
      username,
      token,
      credentialIds: [],
      createdAt: Date.now()
    };
  }
  
  // 生成 challenge（32 字节随机数）
  const challengeBytes = new Uint8Array(32);
  crypto.getRandomValues(challengeBytes);
  const challenge = base64URLEncode(challengeBytes);
  
  // 生成稳定的 WebAuthn 用户 ID（基于用户名，同一用户名始终相同）
  // 这样密码管理器（如 1Password）可以识别并替换现有凭证
  const webAuthnUserIdHash = await crypto.subtle.digest(
    'SHA-256',
    new TextEncoder().encode(`tuzi-passkey-webauthn:${username}`)
  );
  const webAuthnUserID = base64URLEncode(webAuthnUserIdHash);
  
  // 构建注册选项（符合 WebAuthn 规范）
  const options = {
    rp: {
      name: rpConfig.rpName,
      id: rpConfig.rpID
    },
    user: {
      id: webAuthnUserID,
      name: username,
      displayName: username
    },
    challenge: challenge,
    pubKeyCredParams: [
      { type: 'public-key', alg: -7 },  // ES256
      { type: 'public-key', alg: -257 } // RS256
    ],
    timeout: 60000,
    attestation: 'none',
    excludeCredentials: [],  // 清空排除列表，允许重新注册
    authenticatorSelection: {
      residentKey: 'preferred',
      userVerification: 'preferred',
      authenticatorAttachment: 'platform'
    }
  };
  
  // 保存 challenge
  const challengeId = generateUUID();
  
  // 记录当前 Challenge ID 到用户对象
  user.currentChallengeId = challengeId;
  await saveUser(user);
  
  await saveChallenge(challengeId, {
    challenge,
    userId,
    username,
    token,
    webAuthnUserID
  });
  
  return {
    code: RES_CODE.SUCCESS,
    data: {
      options,
      challengeId
    }
  };
}

async function handleVerifyRegistration(data, rpConfig) {
  const { challengeId, response } = data;
  
  if (!challengeId || !response) {
    return { code: RES_CODE.FAIL, message: '缺少必要参数' };
  }
  
  // 获取并删除 challenge
  const challengeData = await getAndDeleteChallenge(challengeId);
  if (!challengeData) {
    return { code: RES_CODE.FAIL, message: 'Challenge 已过期或无效' };
  }
  
  try {
    // 简化验证：仅验证基本的 clientData
    const clientDataJSON = base64URLDecode(response.response.clientDataJSON);
    const clientData = JSON.parse(new TextDecoder().decode(clientDataJSON));
    
    // 验证 challenge
    if (clientData.challenge !== challengeData.challenge) {
      throw new Error('Challenge 不匹配');
    }
    
    // 验证 origin
    if (clientData.origin !== rpConfig.origin) {
      throw new Error(`Origin 不匹配: 期望 ${rpConfig.origin}, 实际 ${clientData.origin}`);
    }
    
    // 验证 type
    if (clientData.type !== 'webauthn.create') {
      throw new Error('无效的操作类型');
    }
    
    // 保存凭证（简化版，不进行完整的 attestation 验证）
    const newCredential = {
      id: response.id,
      publicKey: response.response.attestationObject, // 简化存储
      counter: 0,
      transports: response.response.transports || [],
      deviceType: 'multiDevice',
      backedUp: true,
      userId: challengeData.userId,
      webAuthnUserID: challengeData.webAuthnUserID,
      createdAt: Date.now()
    };
    
    await saveCredential(newCredential);
    
    // 清理旧凭证（实现“更换 Passkey”逻辑）
    // 获取用户所有凭证，删除除当前新凭证外的其他凭证
    const allCredentials = await getUserCredentials(challengeData.userId);
    for (const cred of allCredentials) {
      if (cred.id !== newCredential.id) {
        await deleteCredential(cred.id);
      }
    }
    
    // 更新用户 token
    const user = await getUser(challengeData.userId);
    if (user) {
      user.token = challengeData.token;
      user.updatedAt = Date.now();
      await saveUser(user);
    }
    
    return {
      code: RES_CODE.SUCCESS,
      data: {
        verified: true,
        credentialId: response.id
      }
    };
  } catch (error) {
    console.error('Registration verification error:', error);
    return { code: RES_CODE.FAIL, message: `验证失败: ${error.message}` };
  }
}

// ==================== 认证流程 ====================

async function handleGenerateAuthenticationOptions(data, rpConfig) {
  const { username } = data;
  
  let allowCredentials = [];
  let userId = null;
  
  if (username) {
    userId = await generateUserIdFromUsername(username);
    
    // 清理旧 Challenge
    const user = await getUser(userId);
    if (user && user.currentChallengeId) {
      await kvDelete(`passkey:challenge:${user.currentChallengeId}`);
    }

    const credentials = await getUserCredentials(userId);
    
    if (credentials.length === 0) {
      return { code: RES_CODE.NOT_FOUND, message: '未找到该用户的 Passkey' };
    }
    
    allowCredentials = credentials.map(cred => ({
      id: cred.id,
      type: 'public-key',
      transports: cred.transports || []
    }));
  }
  
  // 生成 challenge
  const challengeBytes = new Uint8Array(32);
  crypto.getRandomValues(challengeBytes);
  const challenge = base64URLEncode(challengeBytes);
  
  const options = {
    challenge: challenge,
    timeout: 60000,
    rpId: rpConfig.rpID,
    userVerification: 'preferred',
    allowCredentials
  };
  
  // 保存 challenge
  const challengeId = generateUUID();
  
  // 如果关联了用户，更新 currentChallengeId
  if (userId) {
    const user = await getUser(userId);
    if (user) {
      user.currentChallengeId = challengeId;
      await saveUser(user);
    }
  }
  
  await saveChallenge(challengeId, {
    challenge,
    userId
  });
  
  return {
    code: RES_CODE.SUCCESS,
    data: {
      options,
      challengeId
    }
  };
}

async function handleVerifyAuthentication(data, rpConfig) {
  const { challengeId, response } = data;
  
  if (!challengeId || !response) {
    return { code: RES_CODE.FAIL, message: '缺少必要参数' };
  }
  
  // 获取并删除 challenge
  const challengeData = await getAndDeleteChallenge(challengeId);
  if (!challengeData) {
    return { code: RES_CODE.FAIL, message: 'Challenge 已过期或无效' };
  }
  
  // 获取凭证
  const credential = await getCredential(response.id);
  if (!credential) {
    return { code: RES_CODE.FAIL, message: '未找到凭证' };
  }
  
  // 获取用户
  const user = await getUser(credential.userId);
  if (!user) {
    return { code: RES_CODE.FAIL, message: '未找到用户' };
  }
  
  try {
    // 简化验证：仅验证基本的 clientData
    const clientDataJSON = base64URLDecode(response.response.clientDataJSON);
    const clientData = JSON.parse(new TextDecoder().decode(clientDataJSON));
    
    // 验证 challenge
    if (clientData.challenge !== challengeData.challenge) {
      throw new Error('Challenge 不匹配');
    }
    
    // 验证 origin
    if (clientData.origin !== rpConfig.origin) {
      throw new Error('Origin 不匹配');
    }
    
    // 验证 type
    if (clientData.type !== 'webauthn.get') {
      throw new Error('无效的操作类型');
    }
    
    // 更新凭证使用时间
    credential.lastUsedAt = Date.now();
    await saveCredential(credential);
    
    return {
      code: RES_CODE.SUCCESS,
      data: {
        verified: true,
        username: user.username,
        token: user.token
      }
    };
  } catch (error) {
    console.error('Authentication verification error:', error);
    return { code: RES_CODE.FAIL, message: `验证失败: ${error.message}` };
  }
}

// ==================== 生成管理令牌 ====================

async function handleGenerateManagementToken(data, rpConfig) {
  const { challengeId, response } = data;
  
  if (!challengeId || !response) {
    return { code: RES_CODE.FAIL, message: '缺少必要参数' };
  }
  
  // 获取并删除 challenge
  const challengeData = await getAndDeleteChallenge(challengeId);
  if (!challengeData) {
    return { code: RES_CODE.FAIL, message: 'Challenge 已过期或无效' };
  }
  
  // 获取凭证
  const credential = await getCredential(response.id);
  if (!credential) {
    return { code: RES_CODE.FAIL, message: '未找到凭证' };
  }
  
  // 获取用户
  const user = await getUser(credential.userId);
  if (!user) {
    return { code: RES_CODE.FAIL, message: '未找到用户' };
  }
  
  try {
    // 简化验证：仅验证基本的 clientData
    const clientDataJSON = base64URLDecode(response.response.clientDataJSON);
    const clientData = JSON.parse(new TextDecoder().decode(clientDataJSON));
    
    // 验证 challenge
    if (clientData.challenge !== challengeData.challenge) {
      throw new Error('Challenge 不匹配');
    }
    
    // 验证 origin
    if (clientData.origin !== rpConfig.origin) {
      throw new Error('Origin 不匹配');
    }
    
    // 验证 type
    if (clientData.type !== 'webauthn.get') {
      throw new Error('无效的操作类型');
    }
    
    // 生成管理令牌
    const managementToken = generateUUID();
    await saveManagementToken(managementToken, credential.userId);
    
    return {
      code: RES_CODE.SUCCESS,
      data: {
        managementToken,
        username: user.username
      }
    };
  } catch (error) {
    console.error('Management token generation error:', error);
    return { code: RES_CODE.FAIL, message: `验证失败: ${error.message}` };
  }
}

// ==================== 凭证管理 ====================

async function handleListCredentials(data) {
  const { username } = data;
  
  if (!username) {
    return { code: RES_CODE.FAIL, message: '用户名不能为空' };
  }
  
  const userId = await generateUserIdFromUsername(username);
  const credentials = await getUserCredentials(userId);
  
  // 返回简化的凭证信息（不包含敏感数据）
  const safeCredentials = credentials.map(cred => ({
    id: cred.id,
    deviceType: cred.deviceType,
    backedUp: cred.backedUp,
    createdAt: cred.createdAt,
    lastUsedAt: cred.lastUsedAt
  }));
  
  return {
    code: RES_CODE.SUCCESS,
    data: safeCredentials
  };
}

async function handleDeleteCredential(data) {
  const { credentialId, username, managementToken } = data;
  
  if (!credentialId || !username) {
    return { code: RES_CODE.FAIL, message: '凭证 ID 和用户名不能为空' };
  }
  
  if (!managementToken) {
    return { code: RES_CODE.FAIL, message: '需要管理令牌，请先完成 Passkey 验证' };
  }
  
  // 验证凭证属于该用户
  const credential = await getCredential(credentialId);
  if (!credential) {
    return { code: RES_CODE.NOT_FOUND, message: '凭证不存在' };
  }
  
  const userId = await generateUserIdFromUsername(username);
  if (credential.userId !== userId) {
    return { code: RES_CODE.FAIL, message: '无权删除此凭证' };
  }
  
  // 验证管理令牌
  const isValid = await validateManagementToken(managementToken, userId);
  if (!isValid) {
    return { code: RES_CODE.FAIL, message: '管理令牌无效或已过期' };
  }
  
  await deleteCredential(credentialId);
  
  return {
    code: RES_CODE.SUCCESS,
    data: { deleted: true }
  };
}

async function handleCancelChallenge(data) {
  const { challengeId } = data;
  if (challengeId) {
    await getAndDeleteChallenge(challengeId);
  }
  return { code: RES_CODE.SUCCESS, message: 'Challenge 已清理' };
}

// ==================== 辅助函数 ====================

async function generateUserIdFromUsername(username) {
  // 使用 SHA-256 生成确定性的用户 ID
  const encoder = new TextEncoder();
  const data = encoder.encode(`tuzi-passkey:${username}`);
  const hashBuffer = await crypto.subtle.digest('SHA-256', data);
  return base64URLEncode(hashBuffer);
}

export default { onRequest };
