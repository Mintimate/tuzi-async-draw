<script setup>
import { computed } from 'vue';

const props = defineProps({
    result: Object,
    loading: Boolean,
    mode: {
        type: String, // 'image' | 'video'
        default: 'image'
    }
});

const isVideo = computed(() => {
    if (props.mode === 'video') return true;
    if (props.result?.object === 'video') return true;
    if (props.result?.video_url?.match(/\.(mp4|webm|mov)$/i)) return true;
    return false;
});
</script>

<template>
    <div class="border-2 border-dashed border-gray-200 rounded-xl min-h-[400px] flex flex-col items-center justify-center bg-gray-50/50 relative overflow-hidden group">
        
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
                <a :href="result.video_url" target="_blank" class="p-2 bg-white rounded-full shadow-lg text-gray-700 hover:text-indigo-600 hover:scale-110 transition" title="Open in new tab">
                    <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4"></path></svg>
                </a>
                <a :href="result.video_url" target="_blank" download class="p-2 bg-white rounded-full shadow-lg text-gray-700 hover:text-indigo-600 hover:scale-110 transition" title="Download">
                        <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14"></path></svg>
                </a>
            </div>
        </template>
        
        <template v-else-if="loading">
            <div class="flex flex-col items-center justify-center">
                <div class="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600 mb-4"></div>
                <p class="text-gray-500 animate-pulse">处理中...</p>
            </div>
        </template>

        <template v-else>
            <div class="text-gray-400 text-center">
                <svg class="w-16 h-16 mx-auto mb-3 opacity-20" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"></path></svg>
                <p>生成结果将在此显示</p>
                <p v-if="mode === 'image'" class="text-xs mt-2 opacity-60">模式: 图像生成</p>
                <p v-else class="text-xs mt-2 opacity-60">模式: 视频生成</p>
            </div>
        </template>

    </div>
</template>
