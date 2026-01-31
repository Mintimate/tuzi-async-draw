<script setup>
import { reactive, ref } from 'vue';

const props = defineProps({
    loading: Boolean
});

const emit = defineEmits(['submit']);

const form = reactive({
    model: 'gemini-3-pro-image-preview-async',
    size: '', 
    prompt: '',
    files: [],
    imageUrl: '' 
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
            <select v-model="form.model" class="mt-1 block w-full pl-3 pr-10 py-2 text-base border-gray-300 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm rounded-md border">
                <option value="gemini-3-pro-image-preview-async">Gemini 3 Pro (1k)</option>
                <option value="gemini-3-pro-image-preview-2k-async">Gemini 3 Pro (2k)</option>
                <option value="gemini-3-pro-image-preview-4k-async">Gemini 3 Pro (4k)</option>
            </select>
        </div>

        <div>
            <label class="block text-sm font-medium text-gray-700 mb-1">尺寸 (Size)</label>
            <div class="relative">
                <select v-model="form.size" class="shadow-sm focus:ring-indigo-500 focus:border-indigo-500 block w-full sm:text-sm border-gray-300 rounded-md py-2 px-3 border">
                    <option value="">默认 (不指定)</option>
                    <option value="1:1">1:1</option>
                    <option value="16:9">16:9</option>
                    <option value="21:9">21:9</option>
                    <option value="3:2">3:2</option>
                    <option value="3:4">3:4</option>
                    <option value="4:3">4:3</option>
                    <option value="4:5">4:5</option>
                    <option value="5:4">5:4</option>
                    <option value="9:16">9:16</option>
                </select>
            </div>
        </div>

        <div>
            <label class="block text-sm font-medium text-gray-700 mb-1">提示词 (Prompt)</label>
            <textarea v-model="form.prompt" rows="4" class="shadow-sm focus:ring-indigo-500 focus:border-indigo-500 block w-full sm:text-sm border-gray-300 rounded-md border p-2 resize-none" placeholder="描述你想要生成的画面..." required></textarea>
        </div>

        <div>
            <label class="block text-sm font-medium text-gray-700 mb-2">参考图 (可选)</label>
            
            <div class="w-full">
                <label class="flex justify-center w-full h-32 px-4 transition bg-white border-2 border-gray-300 border-dashed rounded-xl appearance-none cursor-pointer hover:border-indigo-500 hover:bg-indigo-50 focus:outline-none relative overflow-hidden">
                    
                    <div v-if="form.files && form.files.length > 0" class="flex flex-col items-center justify-center h-full text-green-600">
                            <svg class="w-8 h-8 mb-2" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7"></path></svg>
                        <span class="text-sm font-medium">{{ form.files.length }} 个文件已选择</span>
                        <span class="text-xs text-green-500 mt-1">点击更换 (支持多选)</span>
                    </div>

                    <div v-else class="flex flex-col items-center justify-center h-full">
                        <svg class="w-8 h-8 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"></path></svg>
                        <span class="mt-2 text-sm text-gray-500">点击上传或拖拽 (支持多选)</span>
                    </div>
                    
                    <input type="file" ref="fileInput" @change="handleFileChange" accept="image/*" multiple class="hidden">
                </label>
                
                    <div v-if="!form.files || form.files.length === 0" class="mt-3">
                    <input v-model="form.imageUrl" type="text" placeholder="或者直接粘贴图片 URL (多个用空格或逗号分开)" class="shadow-sm focus:ring-indigo-500 focus:border-indigo-500 block w-full sm:text-sm border-gray-300 rounded-md border py-2 px-3">
                </div>
                
                <div v-if="form.files && form.files.length > 0" class="mt-3 flex flex-wrap gap-2">
                    <span v-for="(file, idx) in form.files" :key="idx" class="inline-flex items-center px-2 py-1 rounded text-xs font-medium bg-gray-100 text-gray-700 border border-gray-200">
                        {{ file.name }}
                    </span>
                </div>
            </div>
        </div>

        <button type="submit" :disabled="loading" class="w-full flex justify-center py-3 px-4 border border-transparent rounded-lg shadow-sm text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200">
            <svg v-if="loading" class="animate-spin -ml-1 mr-2 h-4 w-4 text-white" fill="none" viewBox="0 0 24 24"><circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle><path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path></svg>
            {{ loading ? '正在提交...' : '开始生成图片' }}
        </button>
    </form>
</template>
