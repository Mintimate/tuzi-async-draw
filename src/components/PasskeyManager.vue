<script setup>
import { browserSupportsWebAuthn, startAuthentication, startRegistration } from '@simplewebauthn/browser';
import { onMounted, reactive, ref } from 'vue';
import { useI18n } from 'vue-i18n';

const { t } = useI18n();

const props = defineProps({
  baseUrl: {
    type: String,
    required: true
  },
  currentToken: {
    type: String,
    default: ''
  },
  iconOnly: {
    type: Boolean,
    default: false
  }
});

const emit = defineEmits(['login', 'log']);

// 状态
const isSupported = ref(false);
const loading = reactive({
  register: false,
  login: false,
  list: false,
  delete: false
});
const showModal = ref(false);
const showManageTab = ref(false);
let registerClickCount = 0;
let registerClickTimer = null;

const modalTab = ref('login'); // 'login' | 'register' | 'manage'
const credentials = ref([]);
const managementToken = ref(''); // 管理令牌
const deletingCredentialId = ref(''); // 正在删除确认的凭证ID

// 表单数据
const form = reactive({
  username: localStorage.getItem('tuzi_passkey_username') || ''
});

// 初始化检查 WebAuthn 支持
onMounted(() => {
  isSupported.value = browserSupportsWebAuthn();
});

// 处理注册按钮点击（连点3次解锁管理）
const handleRegisterClick = () => {
  modalTab.value = 'register';
  
  registerClickCount++;
  
  if (registerClickTimer) {
    clearTimeout(registerClickTimer);
  }
  
  registerClickTimer = setTimeout(() => {
    registerClickCount = 0;
  }, 500);
  
  if (registerClickCount >= 3) {
    if (!showManageTab.value) {
      showManageTab.value = true;
      log(t('passkey.logs.adminUnlocked'), 'success');
    }
    registerClickCount = 0;
  }
};

// 日志函数
const log = (content, type = 'info') => {
  emit('log', content, type);
};

// API 调用封装
const callPasskeyAPI = async (action, data) => {
  // 使用相对路径访问 Edge Function
  const response = await fetch('/api/passkey', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({ action, data })
  });
  
  // 检查响应类型
  const contentType = response.headers.get('content-type');
  if (contentType && contentType.includes('application/json')) {
    return await response.json();
  } else {
    // 如果不是 JSON，可能是错误响应
    const text = await response.text();
    throw new Error(`API 返回非 JSON 响应: ${text.substring(0, 200)}`);
  }
};

// 注册 Passkey
const registerPasskey = async () => {
  if (!form.username) {
    log(t('passkey.errors.enterUsername'), 'warning');
    return;
  }

  if (!props.currentToken) {
    log(t('passkey.errors.enterToken'), 'warning');
    return;
  }

  loading.register = true;
  log(t('passkey.logs.startRegister', { username: form.username }), 'info');
  
  let currentChallengeId = null;

  try {
    // 1. 获取注册选项
    const optionsResult = await callPasskeyAPI('generateRegistrationOptions', {
      username: form.username,
      token: props.currentToken
    });

    if (optionsResult.code !== 0) {
      throw new Error(optionsResult.message);
    }

    const { options, challengeId } = optionsResult.data;
    currentChallengeId = challengeId;
    log(t('passkey.logs.getOptions'), 'info');

    // 2. 调用浏览器 WebAuthn API
    const registrationResponse = await startRegistration({ optionsJSON: options });
    log(t('passkey.logs.browserVerify'), 'info');

    // 3. 验证注册响应
    const verifyResult = await callPasskeyAPI('verifyRegistration', {
      challengeId,
      response: registrationResponse
    });

    if (verifyResult.code !== 0) {
      throw new Error(verifyResult.message);
    }
    
    currentChallengeId = null;

    log(t('passkey.logs.registerSuccess'), 'success');
    localStorage.setItem('tuzi_passkey_username', form.username);
    
    // 刷新凭证列表
    await loadCredentials();
    
    // 切换到管理标签
    modalTab.value = 'manage';

  } catch (error) {
    console.error('Registration error:', error);
    
    if (currentChallengeId) {
      callPasskeyAPI('cancelChallenge', { challengeId: currentChallengeId }).catch(e => console.warn('Cleanup failed:', e));
    }
    
    if (error.name === 'InvalidStateError') {
      log(t('passkey.errors.deviceRegistered'), 'warning');
    } else if (error.name === 'NotAllowedError') {
      log(t('passkey.errors.userCancelled'), 'warning');
    } else {
      log(t('passkey.errors.registerFailed', { message: error.message }), 'error');
    }
  } finally {
    loading.register = false;
  }
};

// 使用 Passkey 登录
const loginWithPasskey = async () => {
  loading.login = true;
  log(t('passkey.logs.loginStart'), 'info');
  
  let currentChallengeId = null;

  try {
    // 1. 获取认证选项（不传用户名，使用 discoverable credentials）
    const optionsResult = await callPasskeyAPI('generateAuthenticationOptions', {});

    if (optionsResult.code !== 0) {
      throw new Error(optionsResult.message);
    }

    const { options, challengeId } = optionsResult.data;
    currentChallengeId = challengeId;
    log(t('passkey.logs.getAuthOptions'), 'info');

    // 2. 调用浏览器 WebAuthn API
    const authenticationResponse = await startAuthentication({ optionsJSON: options });
    log(t('passkey.logs.browserAuthComplete'), 'info');

    // 3. 验证认证响应
    const verifyResult = await callPasskeyAPI('verifyAuthentication', {
      challengeId,
      response: authenticationResponse
    });

    if (verifyResult.code !== 0) {
      throw new Error(verifyResult.message);
    }
    
    currentChallengeId = null;

    const { username, token } = verifyResult.data;
    log(t('passkey.logs.loginSuccess', { username }), 'success');
    
    // 保存用户名
    localStorage.setItem('tuzi_passkey_username', username);
    form.username = username;
    
    // 发送登录事件，自动填充 Token
    emit('login', { username, token });
    
    // 关闭弹窗
    showModal.value = false;

  } catch (error) {
    console.error('Authentication error:', error);
    
    if (currentChallengeId) {
      callPasskeyAPI('cancelChallenge', { challengeId: currentChallengeId }).catch(e => console.warn('Cleanup failed:', e));
    }
    
    if (error.name === 'NotAllowedError') {
      log(t('passkey.errors.userCancelled'), 'warning');
    } else {
      log(t('passkey.errors.loginFailed', { message: error.message }), 'error');
    }
  } finally {
    loading.login = false;
  }
};

// 获取管理令牌（通过 Passkey 验证）
const getManagementToken = async () => {
  log(t('passkey.logs.verifyAdmin'), 'info');
  
  let currentChallengeId = null;
  
  try {
    // 1. 获取认证选项
    const optionsResult = await callPasskeyAPI('generateAuthenticationOptions', {
      username: form.username
    });

    if (optionsResult.code !== 0) {
      throw new Error(optionsResult.message);
    }

    const { options, challengeId } = optionsResult.data;
    currentChallengeId = challengeId;
    log(t('passkey.logs.verifyInModal'), 'info');

    // 2. 调用浏览器 WebAuthn API
    const authenticationResponse = await startAuthentication({ optionsJSON: options });
    log(t('passkey.logs.genAdminToken'), 'info');

    // 3. 生成管理令牌
    const tokenResult = await callPasskeyAPI('generateManagementToken', {
      challengeId,
      response: authenticationResponse
    });

    if (tokenResult.code !== 0) {
      throw new Error(tokenResult.message);
    }
    
    currentChallengeId = null;

    managementToken.value = tokenResult.data.managementToken;
    log(t('passkey.logs.adminSuccess'), 'success');
    return true;
  } catch (error) {
    console.error('Get management token error:', error);
    
    if (currentChallengeId) {
      callPasskeyAPI('cancelChallenge', { challengeId: currentChallengeId }).catch(e => console.warn('Cleanup failed:', e));
    }
    
    if (error.name === 'NotAllowedError') {
      log(t('passkey.errors.userCancelled'), 'warning');
    } else {
      log(t('passkey.errors.verifyFailed', { message: error.message }), 'error');
    }
    return false;
  }
};

// 加载凭证列表
const loadCredentials = async () => {
  if (!form.username) return;
  
  loading.list = true;
  try {
    const result = await callPasskeyAPI('listCredentials', {
      username: form.username
    });

    if (result.code === 0) {
      credentials.value = result.data;
    } else {
      throw new Error(result.message);
    }
  } catch (error) {
    console.error('Load credentials error:', error);
    log(t('passkey.errors.loadFailed', { message: error.message }), 'error');
  } finally {
    loading.list = false;
  }
};

// 显示删除确认
const showDeleteConfirm = (credentialId) => {
  deletingCredentialId.value = credentialId;
};

// 取消删除
const cancelDelete = () => {
  deletingCredentialId.value = '';
};

// 删除凭证
const deleteCredentialById = async (credentialId) => {
  deletingCredentialId.value = '';
  
  // 删除操作需要管理令牌，先获取
  if (!managementToken.value) {
    const success = await getManagementToken();
    if (!success) return;
  }
  
  loading.delete = true;
  try {
    const result = await callPasskeyAPI('deleteCredential', {
      credentialId,
      username: form.username,
      managementToken: managementToken.value
    });

    if (result.code === 0) {
      log(t('passkey.logs.deleted'), 'success');
      await loadCredentials();
    } else if (result.message.includes('管理令牌')) {
      // 令牌过期，重新获取
      managementToken.value = '';
      log(t('passkey.errors.tokenExpired'), 'warning');
    } else {
      throw new Error(result.message);
    }
  } catch (error) {
    log(t('passkey.errors.deleteFailed', { message: error.message }), 'error');
  } finally {
    loading.delete = false;
  }
};

// 打开弹窗
const openModal = (tab = 'login') => {
  modalTab.value = tab;
  showModal.value = true;
  
  // 清空管理令牌（重新验证）
  managementToken.value = '';
  
  // 如果是管理标签，加载凭证列表
  if (tab === 'manage' && form.username) {
    loadCredentials();
  }
};

// 格式化日期
const formatDate = (timestamp) => {
  if (!timestamp) return '-';
  return new Date(timestamp).toLocaleString();
};

// 暴露方法给父组件
defineExpose({
  openModal,
  isSupported
});
</script>

<template>
  <div class="passkey-manager contents">
    <!-- 触发按钮 -->
    <div v-if="isSupported">
      <button 
        v-if="!iconOnly"
        @click="openModal('login')"
        class="w-full flex items-center justify-center px-4 py-2 border border-dashed border-gray-300 dark:border-gray-600 rounded-lg text-xs font-medium text-gray-500 dark:text-gray-400 hover:text-indigo-600 dark:hover:text-indigo-400 hover:border-indigo-300 dark:hover:border-indigo-600 hover:bg-indigo-50/50 dark:hover:bg-indigo-900/20 transition-all group"
        title="快速登录"
      >
        <svg class="w-4 h-4 mr-1.5 text-gray-400 dark:text-gray-500 group-hover:text-indigo-500 dark:group-hover:text-indigo-400 transition-colors" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 7a2 2 0 012 2m4 0a6 6 0 01-7.743 5.743L11 17H9v2H7v2H4a1 1 0 01-1-1v-2.586a1 1 0 01.293-.707l5.964-5.964A6 6 0 1121 9z" />
        </svg>
        Passkey 填充 Token
      </button>
      <button 
        v-else
        @click="openModal('login')"
        class="px-3 py-2 text-gray-400 dark:text-gray-500 hover:text-indigo-600 dark:hover:text-indigo-400 focus:outline-none flex items-center transition-colors border-l border-gray-100 dark:border-gray-700"
        title="使用 Passkey 保存/填充 Token"
      >
        <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 7a2 2 0 012 2m4 0a6 6 0 01-7.743 5.743L11 17H9v2H7v2H4a1 1 0 01-1-1v-2.586a1 1 0 01.293-.707l5.964-5.964A6 6 0 1121 9z" />
        </svg>
      </button>
    </div>
    
    <!-- 不支持提示 -->
    <div v-else-if="!iconOnly" class="text-xs text-gray-400 dark:text-gray-500 flex items-center gap-1">
      <svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
      </svg>
      浏览器不支持 Passkey
    </div>

    <!-- 弹窗 -->
    <Teleport to="body">
      <div v-if="showModal" class="fixed inset-0 z-50 flex items-center justify-center p-4">
        <!-- 遮罩 -->
        <transition 
          enter-active-class="transition-opacity duration-300 ease-out"
          enter-from-class="opacity-0"
          enter-to-class="opacity-100"
          leave-active-class="transition-opacity duration-200 ease-in"
          leave-from-class="opacity-100"
          leave-to-class="opacity-0"
        >
          <div class="absolute inset-0 bg-gray-900/60 dark:bg-gray-900/80 backdrop-blur-sm" @click="showModal = false"></div>
        </transition>
        
        <!-- 弹窗内容 -->
        <transition
          enter-active-class="transition-all duration-300 ease-out"
          enter-from-class="opacity-0 scale-95 translate-y-4"
          enter-to-class="opacity-100 scale-100 translate-y-0"
          leave-active-class="transition-all duration-200 ease-in"
          leave-from-class="opacity-100 scale-100 translate-y-0"
          leave-to-class="opacity-0 scale-95 translate-y-4"
        >
          <div class="relative bg-white dark:bg-gray-800 rounded-2xl shadow-xl w-full max-w-md overflow-hidden ring-1 ring-gray-900/5 dark:ring-gray-700/50">
            <!-- 标题栏 -->
            <div class="px-6 py-5 border-b border-gray-100 dark:border-gray-700 flex items-center justify-between bg-white dark:bg-gray-800">
              <div>
                <h3 class="text-lg font-bold text-gray-900 dark:text-gray-100">Passkey 管理</h3>
                <p class="text-xs text-gray-500 dark:text-gray-400 mt-0.5">安全、快速的无密码体验。（使用 Passkey 云同步 Token）</p>
              </div>
              <button @click="showModal = false" class="p-2 text-gray-400 dark:text-gray-500 hover:text-gray-600 dark:hover:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors">
                <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
            
            <!-- 标签切换 (Segmented Control) -->
            <div class="px-6 pt-6 pb-2">
              <div class="flex p-1 bg-gray-100 dark:bg-gray-700 rounded-xl">
                <button 
                  @click="modalTab = 'login'"
                  class="flex-1 py-2 text-sm font-medium rounded-lg transition-all"
                  :class="modalTab === 'login' ? 'bg-white dark:bg-gray-600 text-gray-900 dark:text-gray-100 shadow-sm' : 'text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300'"
                >
                  🔐 登录
                </button>
                <button 
                  @click="handleRegisterClick"
                  class="flex-1 py-2 text-sm font-medium rounded-lg transition-all"
                  :class="modalTab === 'register' ? 'bg-white dark:bg-gray-600 text-gray-900 dark:text-gray-100 shadow-sm' : 'text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300'"
                >
                  ➕ 注册
                </button>
                <button 
                  v-if="showManageTab"
                  @click="modalTab = 'manage'; loadCredentials()"
                  class="flex-1 py-2 text-sm font-medium rounded-lg transition-all"
                  :class="modalTab === 'manage' ? 'bg-white dark:bg-gray-600 text-gray-900 dark:text-gray-100 shadow-sm' : 'text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300'"
                >
                  ⚙️ 管理
                </button>
              </div>
            </div>
            
            <!-- 内容区域 -->
            <div class="p-6">
              <!-- 登录标签 -->
              <div v-show="modalTab === 'login'" class="space-y-6">
                <div class="text-center py-4">
                  <div class="inline-flex items-center justify-center w-16 h-16 rounded-full bg-indigo-50 dark:bg-indigo-900/20 mb-4 text-indigo-600 dark:text-indigo-400">
                    <svg class="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 7a2 2 0 012 2m4 0a6 6 0 01-7.743 5.743L11 17H9v2H7v2H4a1 1 0 01-1-1v-2.586a1 1 0 01.293-.707l5.964-5.964A6 6 0 1121 9z" />
                    </svg>
                  </div>
                  <h4 class="text-base font-semibold text-gray-900 dark:text-gray-100">欢迎回来</h4>
                  <p class="text-sm text-gray-500 dark:text-gray-400 mt-1 max-w-xs mx-auto">
                    点击下方按钮唤起系统 Passkey 验证，验证成功后将自动填入 Token。
                  </p>
                </div>
                
                <button 
                  @click="loginWithPasskey"
                  :disabled="loading.login"
                  class="w-full py-3.5 px-4 bg-gray-900 dark:bg-gray-700 text-white font-medium rounded-xl hover:bg-gray-800 dark:hover:bg-gray-600 hover:shadow-lg hover:-translate-y-0.5 dark:hover:shadow-none focus:outline-none focus:ring-2 focus:ring-offset-2 dark:focus:ring-offset-gray-800 focus:ring-gray-900 dark:focus:ring-gray-700 disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:translate-y-0 disabled:hover:shadow-none transition-all flex items-center justify-center gap-2"
                >
                  <svg v-if="loading.login" class="w-5 h-5 animate-spin" fill="none" viewBox="0 0 24 24">
                    <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
                    <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                  <span>{{ loading.login ? '正在验证...' : '开始验证' }}</span>
                </button>
              </div>
              
              <!-- 注册标签 -->
              <div v-show="modalTab === 'register'" class="space-y-4">
                <div class="p-4 bg-indigo-50/50 dark:bg-indigo-900/20 rounded-xl border border-indigo-100/50 dark:border-indigo-800/30">
                  <h5 class="text-sm font-semibold text-indigo-900 dark:text-indigo-300 mb-1">Passkey 优势</h5>
                  <p class="text-xs text-indigo-700/80 dark:text-indigo-300/80 leading-relaxed">
                    绑定后，您可以使用指纹、面容 ID 或 PIN 码快速登录，无需手动复制粘贴 Token。更加安全、便捷。
                  </p>
                </div>
                
                <div class="space-y-1.5">
                  <label class="block text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase ml-1">用户名</label>
                  <div class="relative">
                    <div class="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                      <svg class="h-5 w-5 text-gray-400 dark:text-gray-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                      </svg>
                    </div>
                    <input 
                      v-model="form.username" 
                      type="text" 
                      placeholder="设置一个不会与他人冲突的用户名 (建议唯一且复杂)"
                      class="block w-full pl-10 pr-3 py-2.5 border border-gray-200 dark:border-gray-600 rounded-xl leading-5 bg-gray-50 dark:bg-gray-700 placeholder-gray-400 dark:placeholder-gray-500 focus:outline-none focus:bg-white dark:focus:bg-gray-600 focus:ring-2 focus:ring-indigo-500/20 dark:focus:ring-indigo-500/30 focus:border-indigo-500 transition-all sm:text-sm text-gray-900 dark:text-gray-100"
                    >
                  </div>
                  <div class="mt-2 rounded-lg border border-yellow-200 dark:border-yellow-900/40 bg-yellow-50 dark:bg-yellow-900/20 px-3 py-2 flex items-start gap-3">
                    <svg class="w-4 h-4 text-yellow-600 dark:text-yellow-500 mt-0.5 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0zM12 9v4m0 4h.01" />
                    </svg>
                    <div>
                      <p class="text-xs font-medium text-yellow-800 dark:text-yellow-400">重要提示</p>
                      <p class="text-xs text-yellow-800/95 dark:text-yellow-300/80 leading-relaxed">请设置一个不会与他人冲突的唯一用户名。用户名仅作为存储键，不会泄露 Token 内容。</p>
                    </div>
                  </div>
                </div>
                
                <div class="space-y-1.5">
                   <label class="block text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase ml-1">绑定 Token</label>
                   <div class="p-3 bg-gray-50 dark:bg-gray-700 rounded-xl border border-dashed border-gray-300 dark:border-gray-600 text-xs text-gray-500 dark:text-gray-400 flex items-center gap-2">
                      <span class="flex-shrink-0 w-1.5 h-1.5 rounded-full bg-green-500"></span>
                      将使用当前填写的 API Token 进行绑定
                   </div>
                </div>
                
                <button 
                  @click="registerPasskey"
                  :disabled="loading.register || !form.username || !currentToken"
                  class="w-full mt-2 py-3 px-4 bg-indigo-600 text-white font-medium rounded-xl hover:bg-indigo-700 dark:hover:bg-indigo-700 hover:shadow-lg hover:shadow-indigo-500/20 dark:hover:shadow-indigo-500/10 focus:outline-none focus:ring-2 focus:ring-offset-2 dark:focus:ring-offset-gray-800 focus:ring-indigo-500 disabled:opacity-50 disabled:cursor-not-allowed transition-all flex items-center justify-center gap-2"
                >
                  <svg v-if="loading.register" class="w-5 h-5 animate-spin" fill="none" viewBox="0 0 24 24">
                    <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
                    <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                  {{ loading.register ? '处理中...' : '注册 / 更新 Passkey' }}
                </button>
              </div>
              
              <!-- 管理标签 -->
              <div v-show="modalTab === 'manage'" class="space-y-4">
                <div class="space-y-1.5">
                  <label class="block text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase ml-1">查询用户名</label>
                  <div class="flex gap-2">
                    <div class="relative flex-1">
                        <div class="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                            <svg class="h-5 w-5 text-gray-400 dark:text-gray-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                            </svg>
                        </div>
                        <input 
                            v-model="form.username" 
                            type="text" 
                            placeholder="输入用户名"
                            class="block w-full pl-10 pr-3 py-2.5 border border-gray-200 dark:border-gray-600 rounded-xl leading-5 bg-gray-50 dark:bg-gray-700 placeholder-gray-400 dark:placeholder-gray-500 focus:outline-none focus:bg-white dark:focus:bg-gray-600 focus:ring-2 focus:ring-indigo-500/20 dark:focus:ring-indigo-500/30 focus:border-indigo-500 transition-all sm:text-sm text-gray-900 dark:text-gray-100"
                        >
                    </div>
                    <button 
                      @click="loadCredentials"
                      :disabled="loading.list || !form.username"
                      class="px-4 py-2 bg-indigo-50 dark:bg-indigo-900/20 hover:bg-indigo-100 dark:hover:bg-indigo-900/30 text-indigo-600 dark:text-indigo-400 rounded-xl font-medium text-sm disabled:opacity-50 transition-colors"
                    >
                      <svg v-if="loading.list" class="w-5 h-5 animate-spin" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                      </svg>
                      <span v-else>查询</span>
                    </button>
                  </div>
                </div>
                
                <!-- 凭证列表 -->
                <div v-if="credentials.length > 0" class="space-y-2 mt-2">
                  <p class="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase ml-1">已绑定的设备</p>
                  <div class="max-h-60 overflow-y-auto space-y-2 pr-1 custom-scrollbar">
                      <div v-for="cred in credentials" :key="cred.id" class="bg-white dark:bg-gray-700 border border-gray-100 dark:border-gray-600 shadow-sm rounded-xl overflow-hidden transition-all">
                        <div class="flex items-center justify-between p-3">
                          <div class="flex items-center gap-3">
                            <div class="w-10 h-10 bg-indigo-50 dark:bg-indigo-900/20 text-indigo-600 dark:text-indigo-400 rounded-full flex items-center justify-center shrink-0">
                              <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 18h.01M8 21h8a2 2 0 002-2V5a2 2 0 00-2-2H8a2 2 0 00-2 2v14a2 2 0 002 2z" />
                              </svg>
                            </div>
                            <div>
                              <div class="text-sm font-semibold text-gray-900 dark:text-gray-100 flex items-center gap-1.5">
                                {{ cred.deviceType === 'multiDevice' ? '云端同步密钥' : '本地设备密钥' }}
                              </div>
                              <div class="text-xs text-gray-400 dark:text-gray-500 mt-0.5 font-mono">
                                {{ formatDate(cred.createdAt) }}
                              </div>
                            </div>
                          </div>
                          <button 
                            @click="showDeleteConfirm(cred.id)"
                            :disabled="loading.delete"
                            class="p-2 text-gray-400 dark:text-gray-500 hover:text-red-500 dark:hover:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-colors"
                            title="删除此 Passkey"
                          >
                            <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                            </svg>
                          </button>
                        </div>
                        
                        <!-- 删除确认区域 -->
                        <transition
                          enter-active-class="transition-all duration-200 ease-out"
                          enter-from-class="max-h-0 opacity-0"
                          enter-to-class="max-h-40 opacity-100"
                          leave-active-class="transition-all duration-200 ease-in"
                          leave-from-class="max-h-40 opacity-100"
                          leave-to-class="max-h-0 opacity-0"
                        >
                          <div v-if="deletingCredentialId === cred.id" class="border-t border-red-200 dark:border-red-900/40 bg-red-50/50 dark:bg-red-900/20 px-4 py-3">
                            <div class="flex items-start gap-2 mb-3">
                              <svg class="w-4 h-4 text-red-600 dark:text-red-500 mt-0.5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                              </svg>
                              <div class="text-xs text-red-800 dark:text-red-300">
                                <p class="font-semibold">确认删除此 Passkey？</p>
                                <p class="mt-0.5 leading-relaxed">删除后需要重新注册才能继续使用。操作需要通过 Passkey 验证身份。</p>
                              </div>
                            </div>
                            <div class="flex gap-2">
                              <button 
                                @click="cancelDelete"
                                class="flex-1 py-2 px-3 bg-white dark:bg-gray-600 text-gray-700 dark:text-gray-200 text-xs font-medium rounded-lg hover:bg-gray-50 dark:hover:bg-gray-500 border border-gray-200 dark:border-gray-500 transition-colors"
                              >
                                取消
                              </button>
                              <button 
                                @click="deleteCredentialById(cred.id)"
                                class="flex-1 py-2 px-3 bg-red-600 text-white text-xs font-medium rounded-lg hover:bg-red-700 dark:hover:bg-red-700 transition-colors flex items-center justify-center gap-1.5"
                              >
                                <svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                                </svg>
                                确认删除
                              </button>
                            </div>
                          </div>
                        </transition>
                      </div>
                  </div>
                </div>
                
                <div v-else-if="form.username && !loading.list" class="flex flex-col items-center justify-center py-8 text-gray-400 dark:text-gray-500 bg-gray-50/50 dark:bg-gray-700/30 rounded-xl border border-dashed border-gray-200 dark:border-gray-600">
                  <svg class="w-12 h-12 mb-3 text-gray-300 dark:text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9.172 16.172a4 4 0 015.656 0M9 10h.01M15 10h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  <p class="text-sm font-medium">暂无数据</p>
                  <p class="text-xs text-gray-400 dark:text-gray-500 mt-1">未查询到该用户的 Passkey</p>
                </div>
              </div>
            </div>
          </div>
        </transition>
      </div>
    </Teleport>
  </div>
</template>
