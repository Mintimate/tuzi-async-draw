<script setup>
import { onMounted, reactive, ref } from 'vue';
import { useI18n } from 'vue-i18n';

const { t } = useI18n();

const stats = reactive({
  totalImages: 0,
  last30DaysVisits: 0,
  last30DaysImages: 0
});

const loading = ref(true);

const fetchStats = async (action = null) => {
  try {
    const options = action ? {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action })
    } : { method: 'GET' };

    const response = await fetch('/api/stats', options);
    const result = await response.json();
    if (result.code === 0) {
      Object.assign(stats, result.data);
    }
  } catch (err) {
    console.error('Failed to fetch stats:', err);
  } finally {
    loading.value = false;
  }
};

onMounted(() => {
  // 首次进入：上报访问并获取数据
  fetchStats('reportVisit');
});

// 暴露给父组件，用于在生成成功后刷新数据
defineExpose({
  reportImageGen: () => fetchStats('reportImage')
});
</script>

<style scoped>
/* 流线型尾翼容器动画 */
@keyframes streamlineFlow {
  0%, 100% {
    transform: translateY(0px);
  }
  50% {
    transform: translateY(-2px);
  }
}

@keyframes tailGlow {
  0%, 100% {
    opacity: 0.3;
    box-shadow: 0 0 15px rgba(99, 102, 241, 0.2);
  }
  50% {
    opacity: 0.6;
    box-shadow: 0 0 25px rgba(99, 102, 241, 0.4);
  }
}

.stats-container {
  animation: streamlineFlow 3s ease-in-out infinite;
}

.tail-glow-bottom {
  animation: tailGlow 4s ease-in-out infinite;
}
</style>

<template>
  <!-- 流线型尾翼整体容器 -->
  <div class="stats-container relative mb-2">
    <!-- 顶部流线型装饰线 -->
    <div class="absolute -top-4 left-0 right-0 h-0.5 bg-gradient-to-r from-transparent via-indigo-300 dark:via-indigo-600 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500"></div>

    <!-- 主容器 - 类似跑车尾翼 -->
    <div class="relative px-2 py-6 rounded-3xl overflow-hidden">
      <!-- 背景渐变层 - 不遮挡内容 -->
      <div class="absolute inset-0 bg-gradient-to-b from-white/80 dark:from-gray-800/40 via-white/40 dark:via-gray-800/20 to-transparent pointer-events-none rounded-3xl"></div>
      
      <!-- 流线型边框效果 -->
      <div class="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-indigo-400/0 via-indigo-300 dark:via-indigo-600 to-purple-400/0 rounded-t-3xl"></div>
      
      <!-- 统计卡片组合 -->
      <div class="relative flex flex-wrap justify-center gap-3 sm:gap-6">
        <!-- 访客统计 -->
        <div class="group min-w-[130px]">
          <div class="relative bg-white/90 dark:bg-gray-800/70 backdrop-blur-sm px-5 py-4 rounded-2xl border border-indigo-100/60 dark:border-indigo-900/30 shadow-[0_8px_32px_rgba(99,102,241,0.08)] dark:shadow-[0_8px_32px_rgba(99,102,241,0.03)] hover:shadow-[0_12px_40px_rgba(99,102,241,0.15)] dark:hover:shadow-[0_12px_40px_rgba(99,102,241,0.1)] transition-all duration-300 flex flex-col items-center">
            <div class="absolute top-0 left-1/2 -translate-x-1/2 w-10 h-0.5 bg-gradient-to-r from-transparent via-indigo-400 dark:via-indigo-500 to-transparent rounded-b-full opacity-50 group-hover:opacity-100 transition-opacity"></div>
            
            <span class="block text-[9px] text-gray-500 dark:text-gray-400 uppercase font-black tracking-[0.15em] mb-2">{{ t('siteStats.last30DaysVisits') }}</span>
            <div v-if="loading" class="h-7 flex items-center justify-center">
              <div class="h-1.5 w-10 bg-indigo-100 dark:bg-indigo-900/40 animate-pulse rounded-full"></div>
            </div>
            <span v-else class="block text-xl font-mono font-bold text-indigo-600 dark:text-indigo-400 drop-shadow-[0_0_6px_rgba(99,102,241,0.25)] dark:drop-shadow-[0_0_6px_rgba(99,102,241,0.15)]">
              {{ stats.last30DaysVisits.toLocaleString() }}
            </span>
          </div>
        </div>

        <!-- 30天生成统计 -->
        <div class="group min-w-[130px]">
          <div class="relative bg-white/90 dark:bg-gray-800/70 backdrop-blur-sm px-5 py-4 rounded-2xl border border-purple-100/60 dark:border-purple-900/30 shadow-[0_8px_32px_rgba(168,85,247,0.08)] dark:shadow-[0_8px_32px_rgba(168,85,247,0.03)] hover:shadow-[0_12px_40px_rgba(168,85,247,0.15)] dark:hover:shadow-[0_12px_40px_rgba(168,85,247,0.1)] transition-all duration-300 flex flex-col items-center">
            <div class="absolute top-0 left-1/2 -translate-x-1/2 w-10 h-0.5 bg-gradient-to-r from-transparent via-purple-400 dark:via-purple-500 to-transparent rounded-b-full opacity-50 group-hover:opacity-100 transition-opacity"></div>
            
            <span class="block text-[9px] text-gray-500 dark:text-gray-400 uppercase font-black tracking-[0.15em] mb-2">{{ t('siteStats.last30DaysImages') }}</span>
            <div v-if="loading" class="h-7 flex items-center justify-center">
              <div class="h-1.5 w-10 bg-purple-100 dark:bg-purple-900/40 animate-pulse rounded-full"></div>
            </div>
            <span v-else class="block text-xl font-mono font-bold text-purple-600 dark:text-purple-400 drop-shadow-[0_0_6px_rgba(168,85,247,0.25)] dark:drop-shadow-[0_0_6px_rgba(168,85,247,0.15)]">
              {{ stats.last30DaysImages.toLocaleString() }}
            </span>
          </div>
        </div>

        <!-- 累计统计 -->
        <div class="group min-w-[130px]">
          <div class="relative bg-white/90 dark:bg-gray-800/70 backdrop-blur-sm px-5 py-4 rounded-2xl border border-slate-100/60 dark:border-slate-800/60 shadow-[0_8px_32px_rgba(100,116,139,0.08)] dark:shadow-[0_8px_32px_rgba(100,116,139,0.03)] hover:shadow-[0_12px_40px_rgba(100,116,139,0.15)] dark:hover:shadow-[0_12px_40px_rgba(100,116,139,0.1)] transition-all duration-300 flex flex-col items-center">
            <div class="absolute top-0 left-1/2 -translate-x-1/2 w-10 h-0.5 bg-gradient-to-r from-transparent via-slate-400 dark:via-slate-600 to-transparent rounded-b-full opacity-50 group-hover:opacity-100 transition-opacity"></div>
            
            <span class="block text-[9px] text-gray-500 dark:text-gray-400 uppercase font-black tracking-[0.15em] mb-2">{{ t('siteStats.totalImages') }}</span>
            <div v-if="loading" class="h-7 flex items-center justify-center">
              <div class="h-1.5 w-14 bg-slate-100 dark:bg-slate-700/40 animate-pulse rounded-full"></div>
            </div>
            <span v-else class="block text-xl font-mono font-bold text-slate-700 dark:text-slate-300">
              {{ stats.totalImages.toLocaleString() }}
            </span>
          </div>
        </div>
      </div>

      <!-- 底部流线型尾翼效果 -->
      <div class="tail-glow-bottom absolute bottom-0 left-1/2 -translate-x-1/2 w-24 h-12 bg-gradient-to-t from-indigo-300/20 dark:from-indigo-500/10 to-transparent rounded-t-full pointer-events-none blur-md"></div>
    </div>
  </div>
</template>
