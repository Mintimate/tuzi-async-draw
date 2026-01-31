<script setup>
import { reactive, ref } from 'vue';

const props = defineProps({
    loading: Boolean
});

const emit = defineEmits(['submit']);

const form = reactive({
    model: 'veo3.1',
    prompt: '',
    seconds: '', // 默认值为空，即不传参数
    size: '',
    watermark: false,
    files: []
});

const fileInput = ref(null);

const handleFileChange = (e) => {
    const selectedFiles = Array.from(e.target.files);
    if (selectedFiles.length > 0) {
        form.files = selectedFiles;
    } else {
        form.files = [];
    }
};

const handleSubmit = () => {
    emit('submit', { ...form });
};
</script>

<template>
    <form @submit.prevent="handleSubmit" class="p-6 space-y-5">
        <div>
            <label class="block text-sm font-medium text-gray-700 mb-1">模型 (Model)</label>
            <select v-model="form.model" class="mt-1 block w-full pl-3 pr-10 py-2 text-base border-gray-300 focus:outline-none focus:ring-purple-500 focus:border-purple-500 sm:text-sm rounded-md border">
                <option value="veo3.1">Veo 3.1</option>
                <option value="veo3.1-pro">Veo 3.1 Pro</option>
                <option value="veo3.1-4k">Veo 3.1 4K</option>
                <option value="veo3.1-pro-4k">Veo 3.1 Pro 4K</option>
                <option value="veo3.1-components">Veo 3.1 Components</option>
                <option value="veo3.1-components-4k">Veo 3.1 Components 4K</option>
            </select>
        </div>

        <div class="grid grid-cols-2 gap-4">
             <div>
                <label class="block text-sm font-medium text-gray-700 mb-1">时长 (Seconds)</label>
                <select v-model="form.seconds" class="mt-1 block w-full pl-3 pr-10 py-2 text-base border-gray-300 focus:outline-none focus:ring-purple-500 focus:border-purple-500 sm:text-sm rounded-md border">
                    <option value="">默认 (不指定)</option>
                    <option value="8">8 秒</option>
                </select>
            </div>
             <div>
                <label class="block text-sm font-medium text-gray-700 mb-1">尺寸 (Size)</label>
                <select v-model="form.size" class="mt-1 block w-full pl-3 pr-10 py-2 text-base border-gray-300 focus:outline-none focus:ring-purple-500 focus:border-purple-500 sm:text-sm rounded-md border">
                    <option value="">默认 (不指定)</option>
                    <option value="1280x720">1280x720 (横屏)</option>
                    <option value="720x1280">720x1280 (竖屏)</option>
                </select>
            </div>
        </div>

        <div>
             <label class="flex items-center space-x-2 cursor-pointer">
                <input type="checkbox" v-model="form.watermark" class="rounded text-purple-600 focus:ring-purple-500 border-gray-300 h-4 w-4">
                <span class="text-sm text-gray-700 font-medium">添加水印 (Watermark)</span>
            </label>
        </div>

        <div>
            <label class="block text-sm font-medium text-gray-700 mb-1">提示词 (Prompt)</label>
            <textarea v-model="form.prompt" rows="4" class="shadow-sm focus:ring-purple-500 focus:border-purple-500 block w-full sm:text-sm border-gray-300 rounded-md border p-2 resize-none" placeholder="描述你想要生成的视频内容..." required></textarea>
        </div>

        <div>
            <label class="block text-sm font-medium text-gray-700 mb-2">参考图 (输入首帧/尾帧)</label>
            
            <div class="w-full">
                <label class="flex justify-center w-full h-32 px-4 transition bg-white border-2 border-gray-300 border-dashed rounded-xl appearance-none cursor-pointer hover:border-purple-500 hover:bg-purple-50 focus:outline-none relative overflow-hidden">
                    
                    <div v-if="form.files && form.files.length > 0" class="flex flex-col items-center justify-center h-full text-green-600">
                            <svg class="w-8 h-8 mb-2" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7"></path></svg>
                        <span class="text-sm font-medium">{{ form.files.length }} 个文件已选择</span>
                        <span class="text-xs text-green-500 mt-1">点击更换</span>
                    </div>

                    <div v-else class="flex flex-col items-center justify-center h-full">
                        <svg class="w-8 h-8 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z"></path></svg>
                        <span class="mt-2 text-sm text-gray-500">点击上传首帧/尾帧图片</span>
                    </div>
                    
                    <input type="file" ref="fileInput" @change="handleFileChange" accept="image/*" multiple class="hidden">
                </label>
                
                <div v-if="form.files && form.files.length > 0" class="mt-3 flex flex-wrap gap-2">
                    <span v-for="(file, idx) in form.files" :key="idx" class="inline-flex items-center px-2 py-1 rounded text-xs font-medium bg-gray-100 text-gray-700 border border-gray-200">
                        {{ file.name }}
                    </span>
                </div>
            </div>
        </div>

        <button type="submit" :disabled="loading" class="w-full flex justify-center py-3 px-4 border border-transparent rounded-lg shadow-sm text-sm font-medium text-white bg-purple-600 hover:bg-purple-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-purple-500 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200">
            <svg v-if="loading" class="animate-spin -ml-1 mr-2 h-4 w-4 text-white" fill="none" viewBox="0 0 24 24"><circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle><path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path></svg>
             {{ loading ? '正在提交...' : '开始生成视频' }}
        </button>
    </form>
</template>
