<script setup>
import { computed } from 'vue';
import { useI18n } from 'vue-i18n';

const { t } = useI18n();

const props = defineProps({
    result: Object,
    loading: Boolean,
    mode: {
        type: String, // 'image' | 'video'
        default: 'image'
    }
});

const isVideo = computed(() => {
    // 优先根据 URL 后缀判断，防止 object 类型与实际文件不符
    if (props.result?.video_url?.match(/\.(jpg|jpeg|png|gif|webp|bmp|tiff)$/i)) return false;
    if (props.result?.video_url?.match(/\.(mp4|webm|mov)$/i)) return true;

    if (props.result?.object === 'video') return true;
    if (props.result?.object === 'image') return false;

    if (props.mode === 'video') return true;
    return false;
});
</script>

<template>
    <div class="border-2 border-dashed border-gray-200 dark:border-gray-700 rounded-xl min-h-[400px] flex flex-col items-center justify-center bg-gray-50/50 dark:bg-gray-800/50 relative overflow-hidden group">
        
        <template v-if="result && result.video_url">
            <!-- Video Player -->
            <div v-if="isVideo" class="relative w-full h-full flex items-center justify-center">
                <video 
                    :src="result.video_url" 
                    controls 
                    autoplay 
                    loop 
                    muted 
                    class="max-w-full max-h-[600px] shadow-lg rounded-lg"
                ></video>
            </div>
            
            <!-- Image Viewer -->
            <img v-else 
                :src="result.video_url" 
                alt="Result" 
                class="max-w-full max-h-[600px] object-contain shadow-lg rounded-lg"
            >

            <!-- Action Buttons -->
            <div class="absolute bottom-4 right-4 flex space-x-2 opacity-0 group-hover:opacity-100 transition-opacity duration-300">
                <a :href="result.video_url" target="_blank" class="p-2 bg-white dark:bg-gray-700 rounded-full shadow-lg text-gray-700 dark:text-gray-300 hover:text-indigo-600 dark:hover:text-indigo-400 hover:scale-110 transition" title="Open in new tab">
                    <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4"></path></svg>
                </a>
                <a :href="result.video_url" target="_blank" download class="p-2 bg-white dark:bg-gray-700 rounded-full shadow-lg text-gray-700 dark:text-gray-300 hover:text-indigo-600 dark:hover:text-indigo-400 hover:scale-110 transition" title="Download">
                        <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14"></path></svg>
                </a>
            </div>
        </template>
        
        <template v-else-if="loading">
            <div class="flex flex-col items-center justify-center">
                <div class="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600 mb-4"></div>
                <p class="text-gray-500 dark:text-gray-400 animate-pulse">{{ t('resultDisplay.processing') }}</p>
            </div>
        </template>

        <template v-else>
            <div class="text-gray-400 dark:text-gray-500 text-center">
                <svg class="w-16 h-16 mx-auto mb-3 opacity-20" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"></path></svg>
                <p>{{ t('resultDisplay.placeholder') }}</p>
                <p v-if="mode === 'image'" class="text-xs mt-2 opacity-60">{{ t('resultDisplay.modeImage') }}</p>
                <p v-else class="text-xs mt-2 opacity-60">{{ t('resultDisplay.modeVideo') }}</p>
            </div>
        </template>

    </div>
</template>
