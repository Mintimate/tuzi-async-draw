<script setup>
import { reactive, ref, watch } from 'vue';
import axios from 'axios';

const config = reactive({
    baseUrl: localStorage.getItem('tuzi_api_base_url') || 'https://api.tu-zi.com',
    token: localStorage.getItem('tuzi_api_token') || ''
});

// 自动保存配置
watch(() => config.baseUrl, (val) => localStorage.setItem('tuzi_api_base_url', val));
watch(() => config.token, (val) => localStorage.setItem('tuzi_api_token', val));

const form = reactive({
    model: 'gemini-3-pro-image-preview-async',
    size: '', // 默认值为空
    prompt: '',
    files: [],
    imageUrl: '' // 文字形式的 URL 或者 file:// 路径
});

const loading = reactive({
    submit: false,
    query: false
});

const error = reactive({
    submit: null,
    query: null
});

const submitResult = ref(null);
const queryTaskId = ref('');
const queryResult = ref(null);
const fileInput = ref(null);

const handleFileChange = (e) => {
    const selectedFiles = Array.from(e.target.files);
    if (selectedFiles.length > 0) {
        form.files = selectedFiles;
    } else {
        form.files = [];
    }
};

const submitTask = async () => {
    loading.submit = true;
    error.submit = null;
    submitResult.value = null;

    try {
        const formData = new FormData();
        formData.append('model', form.model);
        formData.append('prompt', form.prompt);
        if (form.size) formData.append('size', form.size);
        
        // input_reference 逻辑：如果有文件，优先传文件；没有文件则看 URL
        if (form.files && form.files.length > 0) {
            form.files.forEach(file => {
                formData.append('input_reference', file);
            });
        } else if (form.imageUrl) {
            // 支持用换行、逗号或空格分隔的多个 URL
            const urls = form.imageUrl.split(/[\n,\s]+/).map(u => u.trim()).filter(u => u);
            urls.forEach(url => {
                formData.append('input_reference', url);
            });
        }

        const response = await axios.post(`${config.baseUrl.replace(/\/$/, '')}/v1/videos`, formData, {
            headers: {
                'Authorization': `Bearer ${config.token}`,
                'Content-Type': 'multipart/form-data'
            }
        });

        submitResult.value = response.data;
        if (response.data.id) {
            queryTaskId.value = response.data.id;
            // 启动自动轮询
            startPolling(response.data.id);
        }
    } catch (err) {
        console.error(err);
        error.submit = err.response ? 
            `Error ${err.response.status}: ${JSON.stringify(err.response.data)}` : 
            err.message;
    } finally {
        loading.submit = false;
    }
};

const isAutoRefreshing = ref(false);
const pollingTimer = ref(null);

const stopPolling = () => {
    isAutoRefreshing.value = false;
    if (pollingTimer.value) {
        clearTimeout(pollingTimer.value);
        pollingTimer.value = null;
    }
};

const startPolling = (taskId) => {
    if (!taskId) return;
    // 同步 Task ID (防止不一致)
    queryTaskId.value = taskId;

    stopPolling(); 
    isAutoRefreshing.value = true;
    
    const interval = 5000; // 5 seconds
    
    const poll = async () => {
        if (!isAutoRefreshing.value) return;
        
        // 自动刷新时，不占用全局 loading.query 状态，以免干扰 UI 交互
        
        try {
            const response = await axios.get(`${config.baseUrl.replace(/\/$/, '')}/v1/videos/${taskId}`, {
                headers: { 'Authorization': `Bearer ${config.token}` }
            });
            
            const data = response.data;
            queryResult.value = data;
            
            if (data.status === 'completed' || data.status === 'failed') {
                isAutoRefreshing.value = false; // 完成后停止
                return;
            }
            
            // 继续下一次
            if (isAutoRefreshing.value) {
                pollingTimer.value = setTimeout(poll, interval);
            }
            
        } catch (err) {
            console.error("Polling error:", err);
                // 出错继续尝试 (网络波动等)，直到用户手动停止
                if (isAutoRefreshing.value) {
                pollingTimer.value = setTimeout(poll, interval);
                }
        }
    };
    
    // 建议等待
    pollingTimer.value = setTimeout(poll, interval);
};

const toggleAutoRefresh = () => {
    if (isAutoRefreshing.value) {
        stopPolling();
    } else {
        startPolling(queryTaskId.value);
    }
};

const queryTask = async () => {
    // 手动查询时，取消自动刷新
    stopPolling();

    if (!queryTaskId.value) return;
    
    loading.query = true;
    error.query = null;
    
    try {
        const response = await axios.get(`${config.baseUrl.replace(/\/$/, '')}/v1/videos/${queryTaskId.value}`, {
            headers: {
                'Authorization': `Bearer ${config.token}`
            }
        });
        
        queryResult.value = response.data;
    } catch (err) {
        console.error(err);
        error.query = err.response ? 
            `Error ${err.response.status}: ${JSON.stringify(err.response.data)}` : 
            err.message;
    } finally {
        loading.query = false;
    }
};
</script>

<template>
    <div class="min-h-screen bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
        <div class="max-w-7xl mx-auto">
            <!-- Header -->
            <header class="text-center mb-12">
                <h1 class="text-4xl font-extrabold text-transparent bg-clip-text bg-gradient-to-r from-indigo-600 to-purple-600 mb-2">
                    Tuzi Async Draw
                </h1>
                <p class="text-lg text-gray-600">基于 Tuzi API 的高性能异步生图工具</p>
            </header>

            <div class="grid grid-cols-1 lg:grid-cols-3 gap-8">
                <!-- Left Column: Settings & Create -->
                <div class="lg:col-span-1 space-y-6">
                    
                    <!-- Global Config Card -->
                    <div class="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
                        <div class="bg-gray-50 px-6 py-4 border-b border-gray-100">
                            <h2 class="text-sm font-semibold text-gray-900 uppercase tracking-wider">
                                ⚙️ 全局配置
                            </h2>
                        </div>
                        <div class="p-6 space-y-4">
                            <div>
                                <label class="block text-xs font-semibold text-gray-500 uppercase mb-1">API Base URL</label>
                                <input v-model="config.baseUrl" type="text" placeholder="https://api.tu-zi.com">
                            </div>
                            <div>
                                <label class="block text-xs font-semibold text-gray-500 uppercase mb-1">Token</label>
                                <input v-model="config.token" type="password" placeholder="sk-...">
                            </div>

                            <div class="pt-2 text-xs flex flex-col gap-2">
                                <a href="https://api.tu-zi.com/register?aff=SJ33" target="_blank" class="text-indigo-600 hover:text-indigo-800 hover:underline flex items-center gap-1.5 transition-colors">
                                    <svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M18 9v3m0 0v3m0-3h3m-3 0h-3m-2-5a4 4 0 11-8 0 4 4 0 018 0zM3 20a6 6 0 0112 0v1H3v-1z"></path></svg>
                                    注册获取 Token (邀请码: SJ33)
                                </a>
                                <a href="https://tuzi-api.apifox.cn/412175236e0" target="_blank" class="text-gray-500 hover:text-indigo-600 hover:underline flex items-center gap-1.5 transition-colors">
                                    <svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"></path></svg>
                                    查看 API 接口文档
                                </a>
                            </div>
                        </div>
                    </div>

                    <!-- Create Task Card -->
                    <div class="bg-white rounded-2xl shadow-xl shadow-indigo-100/50 border border-gray-100 overflow-hidden">
                        <div class="bg-indigo-600 px-6 py-4 border-b border-indigo-500">
                             <h2 class="text-lg font-bold text-white flex items-center">
                                ✨ 创建任务
                            </h2>
                        </div>
                        
                        <form @submit.prevent="submitTask" class="p-6 space-y-5">
                            <div>
                                <label class="block text-sm font-medium text-gray-700 mb-1">模型 (Model)</label>
                                <select v-model="form.model">
                                    <option value="gemini-3-pro-image-preview-async">Gemini 3 Pro (1k)</option>
                                    <option value="gemini-3-pro-image-preview-2k-async">Gemini 3 Pro (2k)</option>
                                    <option value="gemini-3-pro-image-preview-4k-async">Gemini 3 Pro (4k)</option>
                                </select>
                            </div>

                            <div>
                                <label class="block text-sm font-medium text-gray-700 mb-1">尺寸 (Size)</label>
                                <div class="relative">
                                    <input v-model="form.size" list="size-options" type="text" placeholder="例如 1:1, 16:9...">
                                    <datalist id="size-options">
                                        <option value="1:1" />
                                        <option value="16:9" />
                                        <option value="21:9" />
                                        <option value="3:2" />
                                        <option value="3:4" />
                                        <option value="4:3" />
                                        <option value="4:5" />
                                        <option value="5:4" />
                                        <option value="9:16" />
                                    </datalist>
                                </div>
                            </div>

                            <div>
                                <label class="block text-sm font-medium text-gray-700 mb-1">提示词 (Prompt)</label>
                                <textarea v-model="form.prompt" rows="4" class="resize-none" placeholder="描述你想要生成的画面..." required></textarea>
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
                                        <input v-model="form.imageUrl" type="text" placeholder="或者直接粘贴图片 URL (多个用空格或逗号分开)">
                                    </div>
                                    
                                    <div v-if="form.files && form.files.length > 0" class="mt-3 flex flex-wrap gap-2">
                                        <span v-for="(file, idx) in form.files" :key="idx" class="inline-flex items-center px-2 py-1 rounded text-xs font-medium bg-gray-100 text-gray-700 border border-gray-200">
                                            {{ file.name }}
                                        </span>
                                    </div>
                                </div>
                            </div>

                            <button type="submit" :disabled="loading.submit" class="w-full flex justify-center py-3 px-4 border border-transparent rounded-lg shadow-sm text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200">
                                <svg v-if="loading.submit" class="animate-spin -ml-1 mr-2 h-4 w-4 text-white" fill="none" viewBox="0 0 24 24"><circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle><path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path></svg>
                                {{ loading.submit ? '正在提交...' : '开始生成' }}
                            </button>
                        </form>
                    </div>
                </div>

                <!-- Right Column: Status & Preview -->
                <div class="lg:col-span-2 space-y-6">
                    
                    <!-- Status Card -->
                    <div class="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
                        <div class="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 border-b border-gray-100 pb-4 mb-4">
                            <h2 class="text-xl font-bold text-gray-900">任务状态</h2>
                            <div class="flex gap-2">
                                <div class="relative w-full sm:w-64">
                                     <input v-model="queryTaskId" type="text" class="pr-10" placeholder="任务 ID">
                                     <div class="absolute inset-y-0 right-0 flex items-center">
                                         <button @click="queryTask" :disabled="!queryTaskId || loading.query" class="h-full px-3 text-gray-400 hover:text-indigo-600 transition-colors">
                                             <svg class="w-5 h-5" :class="{'animate-spin': loading.query}" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"></path></svg>
                                         </button>
                                     </div>
                                </div>
                                <button @click="toggleAutoRefresh" :disabled="!queryTaskId" 
                                    :class="isAutoRefreshing ? 'bg-red-50 text-red-600 hover:bg-red-100 border-red-200' : 'bg-gray-50 text-gray-600 hover:bg-gray-100 border-gray-200'"
                                    class="inline-flex items-center px-4 py-2 border rounded-md shadow-sm text-sm font-medium focus:outline-none transition-colors">
                                    <span v-if="isAutoRefreshing" class="relative flex h-2 w-2 mr-2">
                                      <span class="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75"></span>
                                      <span class="relative inline-flex rounded-full h-2 w-2 bg-red-500"></span>
                                    </span>
                                    {{ isAutoRefreshing ? '停止轮询' : '自动轮询' }}
                                </button>
                            </div>
                        </div>

                        <!-- Feedback Messages -->
                        <transition-group name="fade">
                            <div v-if="error.submit" key="err-submit" class="mb-4 p-4 rounded-lg bg-red-50 border border-red-200 flex items-start gap-3">
                                <svg class="w-5 h-5 text-red-500 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"></path></svg>
                                <div class="text-sm text-red-700">{{ error.submit }}</div>
                            </div>
                             <div v-if="error.query" key="err-query" class="mb-4 p-4 rounded-lg bg-red-50 border border-red-200 flex items-start gap-3">
                                <svg class="w-5 h-5 text-red-500 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"></path></svg>
                                <div class="text-sm text-red-700">{{ error.query }}</div>
                            </div>
                            <div v-if="submitResult" key="success-submit" class="mb-4 p-4 rounded-lg bg-green-50 border border-green-200">
                                <div class="flex items-center justify-between mb-2">
                                    <h3 class="text-sm font-bold text-green-800 flex items-center">
                                        <svg class="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7"></path></svg>
                                        提交成功
                                    </h3>
                                    <span class="px-2 py-0.5 rounded text-xs font-bold bg-green-100 text-green-700">{{ submitResult.status }}</span>
                                </div>
                                <div class="text-xs text-green-700 break-all font-mono bg-white/50 p-2 rounded border border-green-100">
                                    {{ submitResult.id }}
                                </div>
                            </div>
                        </transition-group>

                        <!-- Preview Area -->
                        <div class="border-2 border-dashed border-gray-200 rounded-xl min-h-[400px] flex flex-col items-center justify-center bg-gray-50/50 relative overflow-hidden group">
                            
                            <template v-if="queryResult && queryResult.video_url">
                                <img :src="queryResult.video_url" alt="Result" class="max-w-full max-h-[600px] object-contain shadow-lg rounded-lg">
                                <div class="absolute bottom-4 right-4 flex space-x-2 opacity-0 group-hover:opacity-100 transition-opacity duration-300">
                                    <a :href="queryResult.video_url" target="_blank" class="p-2 bg-white rounded-full shadow-lg text-gray-700 hover:text-indigo-600 hover:scale-110 transition">
                                        <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4"></path></svg>
                                    </a>
                                    <a :href="queryResult.video_url" target="_blank" class="p-2 bg-white rounded-full shadow-lg text-gray-700 hover:text-indigo-600 hover:scale-110 transition">
                                         <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14"></path></svg>
                                    </a>
                                </div>
                            </template>
                            
                            <template v-else-if="loading.submit || loading.query">
                                <div class="flex flex-col items-center justify-center">
                                    <div class="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600 mb-4"></div>
                                    <p class="text-gray-500 animate-pulse">处理中...</p>
                                </div>
                            </template>

                            <template v-else>
                                <div class="text-gray-400 text-center">
                                    <svg class="w-16 h-16 mx-auto mb-3 opacity-20" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"></path></svg>
                                    <p>生成结果将在此显示</p>
                                </div>
                            </template>

                        </div>
                        
                        <!-- Video/Image Metadata -->
                         <div v-if="queryResult" class="mt-4 grid grid-cols-2 sm:grid-cols-4 gap-4 p-4 bg-gray-50 rounded-xl text-xs sm:text-sm border border-gray-100">
                             <div>
                                 <span class="block text-gray-400 font-medium uppercase tracking-wider text-[10px]">Status</span>
                                 <span :class="{'text-green-600': queryResult.status === 'completed', 'text-yellow-600': queryResult.status === 'processing', 'text-red-600': queryResult.status === 'failed'}" class="font-bold flex items-center">
                                     <span v-if="queryResult.status === 'processing'" class="w-2 h-2 rounded-full bg-yellow-400 mr-1.5 animate-pulse"></span>
                                     {{ queryResult.status }}
                                 </span>
                             </div>
                             <div>
                                 <span class="block text-gray-400 font-medium uppercase tracking-wider text-[10px]">Progress</span>
                                 <span class="font-medium text-gray-700">{{ queryResult.progress || 0 }}%</span>
                             </div>
                              <div class="col-span-2 sm:col-span-2">
                                 <span class="block text-gray-400 font-medium uppercase tracking-wider text-[10px]">Created</span>
                                 <span class="font-mono text-gray-600">{{ queryResult.created_at ? new Date(queryResult.created_at).toLocaleString() : '-' }}</span>
                             </div>
                         </div>

                    </div>
                    
                </div>
            </div>
            
            <!-- Footer -->
            <footer class="mt-12 text-center border-t border-gray-200 pt-8">
                <div class="flex flex-wrap justify-center gap-6 mb-4">
                    <a href="https://github.com/Mintimate/tuzi-async-draw" target="_blank" class="text-sm font-medium text-gray-500 hover:text-indigo-600 transition-colors">GitHub</a>
                    <a href="https://cnb.cool/Mintimate/tool-forge/tuzi-async-draw" target="_blank" class="text-sm font-medium text-gray-500 hover:text-indigo-600 transition-colors">CNB 镜像</a>
                </div>
                <p class="text-sm text-gray-400">Mintimate 打造 · EdgeOne Pages 驱动</p>
            </footer>
        </div>
    </div>
</template>
