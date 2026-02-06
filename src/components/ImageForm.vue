<script setup>
import { onMounted, onUnmounted, reactive, ref, watch } from 'vue';
import { useI18n } from 'vue-i18n';
import MaskEditor from './MaskEditor.vue';

const { t } = useI18n();

const props = defineProps({
    loading: Boolean,
    isActive: Boolean
});

const emit = defineEmits(['submit', 'log']);

const mode = ref('generate'); // 'generate' | 'inpainting'
const maskEditorRef = ref(null);
const inpaintingFile = ref(null);

const form = reactive({
    model: 'gemini-3-pro-image-preview-4k-async',
    size: '', 
    prompt: '',
    files: [],
    imageUrl: '',
    apiVersion: 'tuzi' // 'tuzi' | 'official'
});

const fileInput = ref(null);
const inpaintingFileInput = ref(null);

// 图片预览 URL 管理
const previewUrls = ref([]);

const updatePreviewUrls = (files) => {
    // 先释放旧的 URL
    previewUrls.value.forEach(url => URL.revokeObjectURL(url));
    // 创建新的预览 URL
    previewUrls.value = files.map(file => URL.createObjectURL(file));
};

watch(() => form.files, (newFiles) => {
    updatePreviewUrls(newFiles || []);
}, { deep: true });

const handleFileChange = (e) => {
    const selectedFiles = Array.from(e.target.files);
    if (selectedFiles.length > 0) {
        form.files = selectedFiles;
        emit('log', { content: t('imageForm.logs.selectedFiles', { count: selectedFiles.length }), type: 'success' });
    } else {
        form.files = [];
    }
};

const handleInpaintingFileChange = (e) => {
    const file = e.target.files[0];
    if (file) {
        inpaintingFile.value = file;
        emit('log', { content: t('imageForm.logs.selectedBaseImage', { name: file.name }), type: 'success' });
    }
};

const removeFile = (index) => {
    const file = form.files[index];
    form.files.splice(index, 1);
    emit('log', { content: t('imageForm.logs.removedFile', { name: file.name }), type: 'info' });
};

const handlePaste = (e) => {
    if (!props.isActive) return;

    const items = e.clipboardData?.items;
    if (!items) return;

    const pastedFiles = [];
    for (const item of items) {
        if (item.kind === 'file' && item.type.startsWith('image/')) {
            const file = item.getAsFile();
            if (file) pastedFiles.push(file);
        }
    }

    if (pastedFiles.length > 0) {
        e.preventDefault();
        
        if (mode.value === 'inpainting') {
            inpaintingFile.value = pastedFiles[0];
            emit('log', { content: t('imageForm.logs.pastedBaseImage', { name: pastedFiles[0].name }), type: 'success' });
        } else {
            // Generate 模式，追加文件
            const currentFiles = Array.isArray(form.files) ? form.files : [];
            form.files = [...currentFiles, ...pastedFiles];
            pastedFiles.forEach(f => {
                emit('log', { content: t('imageForm.logs.pastedFile', { name: f.name }), type: 'success' });
            });
        }
    }
};

onMounted(() => {
    window.addEventListener('paste', handlePaste);
});

onUnmounted(() => {
    window.removeEventListener('paste', handlePaste);
    // 释放所有预览 URL
    previewUrls.value.forEach(url => URL.revokeObjectURL(url));
});

const handleSubmit = async () => {
    const submitData = { ...form };
    
    if (mode.value === 'inpainting') {
        if (!inpaintingFile.value) {
            // 这里可以加个提示，或者依赖 HTML5 required
            return;
        }
        
        // 拼接预置提示词
        submitData.prompt = t('imageForm.prompt.inpaintingPromptPrefix', { prompt: form.prompt });

        // 获取蒙版
        if (maskEditorRef.value) {
            const maskBlob = await maskEditorRef.value.getMaskBlob();
            if (maskBlob) {
                const maskFile = new File([maskBlob], 'mask.png', { type: 'image/png' });
                
                if (form.apiVersion === 'official') {
                    // 官方接口：底图在 files (input_reference)，蒙版在 mask
                    submitData.files = [inpaintingFile.value];
                    submitData.mask = maskFile;
                } else {
                    // 兔子接口：底图和蒙版都在 files (input_reference)
                    submitData.files = [inpaintingFile.value, maskFile];
                }
            } else {
                // 如果获取蒙版失败，至少上传底图
                submitData.files = [inpaintingFile.value];
            }
        } else {
             submitData.files = [inpaintingFile.value];
        }
        
        submitData.modeType = 'inpainting';
    } else {
        submitData.modeType = 'generate';
    }

    emit('submit', submitData);
};
</script>

<template>
    <form @submit.prevent="handleSubmit" class="p-6 space-y-5">
        <!-- 模式切换 -->
        <div class="flex p-1 space-x-1 bg-gray-100 dark:bg-gray-700 rounded-lg">
            <button 
                type="button"
                @click="mode = 'generate'"
                :class="[
                    'w-full py-2.5 text-sm font-medium rounded-md focus:outline-none transition-all duration-200',
                    mode === 'generate' 
                        ? 'bg-white dark:bg-gray-600 text-gray-900 dark:text-white shadow' 
                        : 'text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200'
                ]"
            >
                {{ t('imageForm.mode.generate') }}
            </button>
            <button 
                type="button"
                @click="mode = 'inpainting'"
                :class="[
                    'w-full py-2.5 text-sm font-medium rounded-md focus:outline-none transition-all duration-200',
                    mode === 'inpainting' 
                        ? 'bg-white dark:bg-gray-600 text-gray-900 dark:text-white shadow' 
                        : 'text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200'
                ]"
            >
                {{ t('imageForm.mode.inpainting') }}
            </button>
        </div>

        <div>
            <label class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">{{ t('imageForm.model') }}</label>
            <select v-model="form.model" class="mt-1 block w-full pl-3 pr-10 py-2 text-base border-gray-300 dark:border-gray-600 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm rounded-md border bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100">
                <option value="gemini-3-pro-image-preview-async">Gemini 3 Pro x Nano Banana 2(1k)</option>
                <option value="gemini-3-pro-image-preview-2k-async">Gemini 3 Pro x Nano Banana 2 (2k)</option>
                <option value="gemini-3-pro-image-preview-4k-async">Gemini 3 Pro x Nano Banana 2 (4k)</option>
            </select>
            <p class="mt-1 text-xs text-gray-400 dark:text-gray-500">{{ t('imageForm.actualValue', { value: form.model }) }}</p>
        </div>

        <!-- 接口版本选择 (仅 Inpainting 模式) -->
        <div v-if="mode === 'inpainting'">
            <label class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1 flex items-center">
                {{ t('imageForm.apiVersion.label') }}
                <div class="relative group ml-2">
                    <svg class="w-4 h-4 text-gray-400 cursor-help" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8.228 9c.549-1.165 2.03-2 3.772-2 2.21 0 4 1.343 4 3 0 1.4-1.278 2.575-3.006 2.907-.542.104-.994.54-.994 1.093m0 3h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"></path></svg>
                    <div class="absolute left-0 bottom-full mb-2 hidden group-hover:block w-64 p-2 bg-gray-800 text-white text-xs rounded shadow-lg z-10">
                        <p class="mb-1"><strong>{{ t('imageForm.apiVersion.officialDesc') }}</strong></p>
                        <p><strong>{{ t('imageForm.apiVersion.tuziDesc') }}</strong></p>
                    </div>
                </div>
            </label>
            <div class="flex space-x-4 mt-1">
                <label class="inline-flex items-center cursor-pointer">
                    <input type="radio" v-model="form.apiVersion" value="tuzi" class="form-radio text-indigo-600 focus:ring-indigo-500 h-4 w-4">
                    <span class="ml-2 text-sm text-gray-700 dark:text-gray-300">{{ t('imageForm.apiVersion.tuzi') }}</span>
                </label>
                <label class="inline-flex items-center cursor-pointer">
                    <input type="radio" v-model="form.apiVersion" value="official" class="form-radio text-indigo-600 focus:ring-indigo-500 h-4 w-4">
                    <span class="ml-2 text-sm text-gray-700 dark:text-gray-300">{{ t('imageForm.apiVersion.official') }}</span>
                </label>
            </div>
        </div>

        <div v-if="mode === 'generate'">
            <label class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">{{ t('imageForm.size.label') }}</label>
            <div class="relative">
                <select v-model="form.size" class="shadow-sm focus:ring-indigo-500 focus:border-indigo-500 block w-full sm:text-sm border-gray-300 dark:border-gray-600 rounded-md py-2 px-3 border bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100">
                    <option value="">{{ t('imageForm.size.default') }}</option>
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
            <p class="mt-1 text-xs text-gray-400 dark:text-gray-500">{{ t('imageForm.actualValue', { value: form.size || '""' }) }}</p>
        </div>

        <div>
            <label class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">{{ t('imageForm.prompt.label') }}</label>
            
            <div v-if="mode === 'inpainting'" class="mb-2 p-2 bg-blue-50 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 text-sm rounded-md border border-blue-100 dark:border-blue-800 flex items-center">
                <svg class="w-4 h-4 mr-2 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"></path></svg>
                <span>{{ t('imageForm.prompt.inpaintingPrefix') }}<strong>{{ t('imageForm.prompt.inpaintingPrefixContent') }}</strong></span>
            </div>

            <textarea v-model="form.prompt" rows="4" class="shadow-sm focus:ring-indigo-500 focus:border-indigo-500 block w-full sm:text-sm border-gray-300 dark:border-gray-600 rounded-md border p-2 resize-none bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100" :placeholder="mode === 'inpainting' ? t('imageForm.prompt.inpaintingPlaceholder') : t('imageForm.prompt.generatePlaceholder')" required></textarea>
        </div>

        <!-- 局部覆写模式下的图片上传与编辑 -->
        <div v-if="mode === 'inpainting'">
            <label class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">{{ t('imageForm.inpainting.label') }}</label>
            
            <div v-if="!inpaintingFile" class="w-full">
                <label class="flex justify-center w-full h-32 px-4 transition bg-white dark:bg-gray-700 border-2 border-gray-300 dark:border-gray-600 border-dashed rounded-xl appearance-none cursor-pointer hover:border-indigo-500 hover:bg-indigo-50 dark:hover:bg-gray-600 focus:outline-none relative overflow-hidden">
                    <div class="flex flex-col items-center justify-center h-full">
                        <svg class="w-8 h-8 text-gray-400 dark:text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"></path></svg>
                        <span class="mt-2 text-sm text-gray-500 dark:text-gray-400">{{ t('imageForm.inpainting.uploadText') }}</span>
                    </div>
                    <input type="file" ref="inpaintingFileInput" @change="handleInpaintingFileChange" accept="image/*" class="hidden">
                </label>
            </div>

            <div v-else class="space-y-3">
                <MaskEditor ref="maskEditorRef" :imageFile="inpaintingFile" />
                <button type="button" @click="inpaintingFile = null" class="text-sm text-red-600 hover:text-red-800 dark:text-red-400 dark:hover:text-red-300">
                    {{ t('imageForm.inpainting.changeImage') }}
                </button>
            </div>
        </div>

        <!-- 普通模式下的参考图上传 -->
        <div v-if="mode === 'generate'">
            <label class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">{{ t('imageForm.reference.label') }}</label>
            
            <div class="w-full">
                <label class="flex justify-center w-full h-32 px-4 transition bg-white dark:bg-gray-700 border-2 border-gray-300 dark:border-gray-600 border-dashed rounded-xl appearance-none cursor-pointer hover:border-indigo-500 hover:bg-indigo-50 dark:hover:bg-gray-600 focus:outline-none relative overflow-hidden">
                    
                    <div v-if="form.files && form.files.length > 0" class="flex flex-col items-center justify-center h-full text-green-600 dark:text-green-400">
                            <svg class="w-8 h-8 mb-2" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7"></path></svg>
                        <span class="text-sm font-medium">{{ t('imageForm.reference.selected', { count: form.files.length }) }}</span>
                        <span class="text-xs text-green-500 dark:text-green-400 mt-1">{{ t('imageForm.reference.change') }}</span>
                    </div>

                    <div v-else class="flex flex-col items-center justify-center h-full">
                        <svg class="w-8 h-8 text-gray-400 dark:text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"></path></svg>
                        <span class="mt-2 text-sm text-gray-500 dark:text-gray-400">{{ t('imageForm.reference.uploadText') }}</span>
                    </div>
                    
                    <input type="file" ref="fileInput" @change="handleFileChange" accept="image/*" multiple class="hidden">
                </label>
                
                    <div v-if="!form.files || form.files.length === 0" class="mt-3">
                    <input v-model="form.imageUrl" type="text" :placeholder="t('imageForm.reference.urlPlaceholder')" class="shadow-sm focus:ring-indigo-500 focus:border-indigo-500 block w-full sm:text-sm border-gray-300 dark:border-gray-600 rounded-md border py-2 px-3 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100">
                </div>
                
                <div v-if="form.files && form.files.length > 0" class="mt-3 flex flex-wrap gap-2">
                    <span v-for="(file, idx) in form.files" :key="idx" class="relative group inline-flex items-center px-2 py-1 rounded text-xs font-medium bg-gray-100 dark:bg-gray-600 text-gray-700 dark:text-gray-300 border border-gray-200 dark:border-gray-500 cursor-pointer">
                        {{ file.name }}
                        <button type="button" @click="removeFile(idx)" class="ml-1.5 text-gray-400 hover:text-red-500 focus:outline-none transition-colors" title="移除文件">
                            <svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"></path></svg>
                        </button>
                        <!-- 悬浮预览 -->
                        <div v-if="previewUrls[idx]" class="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 opacity-0 group-hover:opacity-100 transition-opacity duration-200 z-50 pointer-events-none">
                            <div class="bg-white dark:bg-gray-800 rounded-lg shadow-xl border border-gray-200 dark:border-gray-600 p-1">
                                <img :src="previewUrls[idx]" :alt="file.name" decoding="async" class="max-w-48 max-h-48 rounded object-contain" />
                            </div>
                            <div class="absolute top-full left-1/2 -translate-x-1/2 -mt-1 w-2 h-2 bg-white dark:bg-gray-800 border-r border-b border-gray-200 dark:border-gray-600 rotate-45"></div>
                        </div>
                    </span>
                </div>
            </div>
        </div>

        <button type="submit" :disabled="loading" class="w-full flex justify-center py-3 px-4 border border-transparent rounded-lg shadow-sm text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 dark:focus:ring-offset-gray-800 focus:ring-indigo-500 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200">
            <svg v-if="loading" class="animate-spin -ml-1 mr-2 h-4 w-4 text-white" fill="none" viewBox="0 0 24 24"><circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle><path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path></svg>
            {{ loading ? t('imageForm.submit.submitting') : t('imageForm.submit.start') }}
        </button>
    </form>
</template>
