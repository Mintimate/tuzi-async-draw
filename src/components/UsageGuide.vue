<script setup>
import { useI18n } from 'vue-i18n';

const { t } = useI18n();
</script>

<template>
  <div class="px-4">
    <h3 class="text-center text-gray-500 dark:text-gray-400 font-medium mb-8 uppercase tracking-widest text-xs">{{ t('usageGuide.title') }}</h3>
    
    <div class="relative">
      <!-- Connecting Line -->
      <div class="hidden md:block absolute top-6 left-0 w-full h-0.5 bg-gray-100 dark:bg-gray-700 z-0"></div>

      <!-- Direct Query Path (Shortcut) -->
      <div class="hidden md:block absolute top-24 left-[12.5%] w-[75%] h-12 border-b-2 border-x-2 border-dashed border-gray-200 dark:border-gray-700 rounded-b-3xl z-0 pointer-events-none"></div>
      <div class="hidden md:block absolute top-[calc(6rem+3rem)] left-1/2 transform -translate-x-1/2 -translate-y-1/2 bg-gray-50 dark:bg-gray-800 px-3 py-1 text-xs text-gray-400 dark:text-gray-500 z-10">
        {{ t('usageGuide.shortcut') }}
      </div>

      <div class="grid grid-cols-1 md:grid-cols-4 gap-6 relative z-10">
        <!-- Step 1: Preparation (Auth & Passkey) -->
        <div class="flex flex-col items-center text-center group">
          <div class="flex items-center justify-center gap-2 mb-3 h-12 bg-white dark:bg-gray-800 px-2 relative z-10">
            <!-- Manual Config Icon -->
            <div class="w-10 h-10 rounded-full bg-white dark:bg-gray-700 border-2 border-indigo-100 dark:border-indigo-900/30 text-indigo-600 dark:text-indigo-400 flex items-center justify-center shadow-sm group-hover:border-indigo-500 dark:group-hover:border-indigo-600 group-hover:text-indigo-600 dark:group-hover:text-indigo-300 transition-colors duration-300" title="配置鉴权">
              <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 7a2 2 0 012 2m4 0a6 6 0 01-7.743 5.743L11 17H9v2H7v2H4a1 1 0 01-1-1v-2.586a1 1 0 01.293-.707l5.964-5.964A6 6 0 1121 9z"></path></svg>
            </div>
            
            <span class="text-gray-300 dark:text-gray-600 text-xs font-bold">/</span>

            <!-- Passkey Icon -->
            <div class="w-10 h-10 rounded-full bg-white dark:bg-gray-700 border-2 border-pink-100 dark:border-pink-900/30 text-pink-600 dark:text-pink-400 flex items-center justify-center shadow-sm group-hover:border-pink-500 dark:group-hover:border-pink-600 group-hover:text-pink-600 dark:group-hover:text-pink-300 transition-colors duration-300" title="Passkey">
              <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 11c0 3.517-1.009 6.799-2.753 9.571m-3.44-2.04l.054-.09A13.916 13.916 0 008 11a4 4 0 118 0c0 1.017-.07 2.019-.203 3m-2.118 6.844A21.88 21.88 0 0015.171 17m3.839 1.132c.645-2.266.99-4.659.99-7.132A8 8 0 008 4.07M3 15.364c.64-1.319 1-2.8 1-4.364 0-1.457.2-2.858.59-4.18M5.5 5.5A16.1 16.1 0 002.25 6"></path></svg>
            </div>
          </div>
          <h4 class="text-sm font-bold text-gray-900 dark:text-gray-100 mb-1">{{ t('usageGuide.step1.title') }}</h4>
          <p class="text-xs text-gray-500 dark:text-gray-400">{{ t('usageGuide.step1.desc') }}</p>
        </div>

        <!-- Step 2 -->
        <div class="flex flex-col items-center text-center group">
          <div class="w-12 h-12 rounded-full bg-white dark:bg-gray-700 border-2 border-purple-100 dark:border-purple-900/30 text-purple-600 dark:text-purple-400 flex items-center justify-center mb-3 shadow-sm group-hover:border-purple-500 dark:group-hover:border-purple-600 group-hover:text-purple-600 dark:group-hover:text-purple-300 transition-colors duration-300 relative z-10">
            <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"></path></svg>
          </div>
          <h4 class="text-sm font-bold text-gray-900 dark:text-gray-100 mb-1">{{ t('usageGuide.step2.title') }}</h4>
          <p class="text-xs text-gray-500 dark:text-gray-400">{{ t('usageGuide.step2.desc') }}</p>
        </div>

        <!-- Step 3 -->
        <div class="flex flex-col items-center text-center group">
          <div class="w-12 h-12 rounded-full bg-white dark:bg-gray-700 border-2 border-blue-100 dark:border-blue-900/30 text-blue-600 dark:text-blue-400 flex items-center justify-center mb-3 shadow-sm group-hover:border-blue-500 dark:group-hover:border-blue-600 group-hover:text-blue-600 dark:group-hover:text-blue-300 transition-colors duration-300 relative z-10">
            <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 10V3L4 14h7v7l9-11h-7z"></path></svg>
          </div>
          <h4 class="text-sm font-bold text-gray-900 dark:text-gray-100 mb-1">{{ t('usageGuide.step3.title') }}</h4>
          <p class="text-xs text-gray-500 dark:text-gray-400">{{ t('usageGuide.step3.desc') }}</p>
        </div>

        <!-- Step 4 -->
        <div class="flex flex-col items-center text-center group">
          <div class="w-12 h-12 rounded-full bg-white dark:bg-gray-700 border-2 border-green-100 dark:border-green-900/30 text-green-600 dark:text-green-400 flex items-center justify-center mb-3 shadow-sm group-hover:border-green-500 dark:group-hover:border-green-600 group-hover:text-green-600 dark:group-hover:text-green-300 transition-colors duration-300 relative z-10">
            <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"></path></svg>
          </div>
          <h4 class="text-sm font-bold text-gray-900 dark:text-gray-100 mb-1">{{ t('usageGuide.step4.title') }}</h4>
          <p class="text-xs text-gray-500 dark:text-gray-400">{{ t('usageGuide.step4.desc') }}</p>
        </div>
      </div>
    </div>

    <div class="mt-16 mb-8 p-4 bg-indigo-50 dark:bg-indigo-900/20 rounded-lg border border-indigo-100 dark:border-indigo-900/30 text-sm text-indigo-800 dark:text-indigo-300 flex items-start gap-3">
        <svg class="w-5 h-5 flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"></path></svg>
        <div>
            <p class="font-bold mb-1">{{ t('usageGuide.tip.title') }}</p>
            <p class="opacity-90 dark:opacity-80">{{ t('usageGuide.tip.content') }}</p>
        </div>
    </div>    <!-- <div class="mt-6 text-center">
        <a href="https://afdian.com/a/mintimate" target="_blank" class="inline-flex items-center gap-1 text-xs text-gray-400 hover:text-indigo-500 transition-colors">
            <span>⚡</span> 支持一下 (爱发电)
        </a>
    </div> -->
  </div>
</template>
