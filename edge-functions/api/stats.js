/**
 * Tuzi Async Studio - Statistics Edge Function
 * 使用 WEBSITE_KV 统计访客与生成次数
 */

const RES_CODE = { SUCCESS: 0, FAIL: 1000 };

export async function onRequest(context) {
  const { request } = context;
  const url = new URL(request.url);

  // 处理 CORS
  if (request.method === 'OPTIONS') {
    return new Response(null, {
      status: 204,
      headers: getCorsHeaders(request)
    });
  }

  if (typeof WEBSITE_KV === 'undefined') {
    return new Response(JSON.stringify({ code: RES_CODE.FAIL, message: 'WEBSITE_KV 未绑定' }), {
      headers: getCorsHeaders(request)
    });
  }

  try {
    if (request.method === 'GET') {
      const stats = await getStatsData();
      return new Response(JSON.stringify({ code: RES_CODE.SUCCESS, data: stats }), {
        headers: getCorsHeaders(request)
      });
    } else if (request.method === 'POST') {
      const body = await request.json();
      const stats = await handleReportAndReturn(body.action);
      return new Response(JSON.stringify({ code: RES_CODE.SUCCESS, data: stats }), {
        headers: getCorsHeaders(request)
      });
    }
  } catch (e) {
    return new Response(JSON.stringify({ code: RES_CODE.FAIL, message: e.message }), {
      headers: getCorsHeaders(request)
    });
  }
}

async function getStatsData() {
  const now = new Date();
  const stats = {
    totalImages: 0,
    last30DaysVisits: 0,
    last30DaysImages: 0
  };

  // 获取总生成数
  const totalImages = await WEBSITE_KV.get('stats:total_images');
  stats.totalImages = parseInt(totalImages || '0');

  // 并行获取近 30 天数据
  const dayKeys = [];
  for (let i = 0; i < 30; i++) {
    const d = new Date(now);
    d.setDate(d.getDate() - i);
    const dateStr = d.toISOString().split('T')[0].replace(/-/g, '');
    dayKeys.push(`stats:day:${dateStr}`);
  }

  const results = await Promise.all(dayKeys.map(key => WEBSITE_KV.get(key)));
  
  results.forEach(val => {
    if (val) {
      const data = JSON.parse(val);
      stats.last30DaysVisits += (data.visits || 0);
      stats.last30DaysImages += (data.images || 0);
    }
  });

  return stats;
}

async function handleReportAndReturn(action) {
  const dateStr = new Date().toISOString().split('T')[0].replace(/-/g, '');
  const dayKey = `stats:day:${dateStr}`;
  
  // 获取当天数据
  const currentDayDataRaw = await WEBSITE_KV.get(dayKey);
  const dayData = currentDayDataRaw ? JSON.parse(currentDayDataRaw) : { visits: 0, images: 0 };

  if (action === 'reportVisit') {
    dayData.visits = (dayData.visits || 0) + 1;
    await WEBSITE_KV.put(dayKey, JSON.stringify(dayData));
  } else if (action === 'reportImage') {
    dayData.images = (dayData.images || 0) + 1;
    await WEBSITE_KV.put(dayKey, JSON.stringify(dayData));
    
    // 增加总计数
    const totalImages = await WEBSITE_KV.get('stats:total_images');
    const newTotal = parseInt(totalImages || '0') + 1;
    await WEBSITE_KV.put('stats:total_images', newTotal.toString());
  }

  // 直接返回更新后的最新统计
  return await getStatsData();
}

function getCorsHeaders(request) {
  const origin = request.headers.get('origin') || '*';
  return {
    'Content-Type': 'application/json; charset=UTF-8',
    'Access-Control-Allow-Origin': origin,
    'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Access-Control-Max-Age': '600'
  };
}

export default { onRequest };
