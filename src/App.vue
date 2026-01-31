<script setup>
import { reactive, ref, watch } from 'vue';
import axios from 'axios';
import ImageForm from './components/ImageForm.vue';
import VideoForm from './components/VideoForm.vue';
import LogConsole from './components/LogConsole.vue';
import ResultDisplay from './components/ResultDisplay.vue';

const config = reactive({
    baseUrl: localStorage.getItem('tuzi_api_base_url') || 'https://api.tu-zi.com',
    token: localStorage.getItem('tuzi_api_token') || ''
});

// Token visibility
const showToken = ref(false);

// Logs System
const logs = ref([]);
const addLog = (content, type = 'info') => {
    const now = new Date();
    const time = `${now.getHours().toString().padStart(2, '0')}:${now.getMinutes().toString().padStart(2, '0')}:${now.getSeconds().toString().padStart(2, '0')}`;
    logs.value.push({
        id: Date.now() + Math.random(),
        time,
        content,
        type
    });
};

// 自动保存配置
watch(() => config.baseUrl, (val) => localStorage.setItem('tuzi_api_base_url', val));
watch(() => config.token, (val) => localStorage.setItem('tuzi_api_token', val));

const activeTab = ref('image'); // 'image' | 'video'

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

// Reset state when switching tabs
watch(activeTab, () => {
    submitResult.value = null;
    queryResult.value = null;
    queryTaskId.value = '';
    logs.value = [];
    stopPolling();
    addLog(`切换到${activeTab.value === 'image' ? '图片' : '视频'}生成模式`, 'info');
});

const submitTask = async (formDataObj) => {
    loading.submit = true;
    error.submit = null;
    submitResult.value = null;
    logs.value = []; 
    addLog(`开始创建任务 [${formDataObj.model}]...`, 'info');

    try {
        const formData = new FormData();
        formData.append('model', formDataObj.model);
        formData.append('prompt', formDataObj.prompt);
        if (formDataObj.size) formData.append('size', formDataObj.size);
        if (formDataObj.seconds) formData.append('seconds', formDataObj.seconds);
        if (formDataObj.watermark !== undefined) formData.append('watermark', formDataObj.watermark);
        
        // input_reference 逻辑
        if (formDataObj.files && formDataObj.files.length > 0) {
            formDataObj.files.forEach(file => {
                formData.append('input_reference', file);
                addLog(`添加参考图片: ${file.name}`, 'info');
            });
        } else if (formDataObj.imageUrl) {
            const urls = formDataObj.imageUrl.split(/[\n,\s]+/).map(u => u.trim()).filter(u => u);
            urls.forEach(url => {
                formData.append('input_reference', url);
                addLog(`添加参考 URL: ${url}`, 'info');
            });
        }

        addLog('正在向服务器提交请求...', 'info');

        const response = await axios.post(`${config.baseUrl.replace(/\/$/, '')}/v1/videos`, formData, {
            headers: {
                'Authorization': `Bearer ${config.token}`,
                'Content-Type': 'multipart/form-data'
            }
        });

        submitResult.value = response.data;
        addLog(`任务提交成功! ID: ${response.data.id}`, 'success');

        if (response.data.id) {
            queryTaskId.value = response.data.id;
            addLog(`准备开始轮询任务状态...`, 'info');
            startPolling(response.data.id);
        }
    } catch (err) {
        console.error(err);
        const errMsg = err.response ? 
            `Error ${err.response.status}: ${JSON.stringify(err.response.data)}` : 
            err.message;
        error.submit = errMsg;
        addLog(`任务提交失败: ${errMsg}`, 'error');
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
    queryTaskId.value = taskId;

    stopPolling(); 
    isAutoRefreshing.value = true;
    
    const interval = 5000; 
    
    const poll = async () => {
        if (!isAutoRefreshing.value) return;
        
        try {
            const response = await axios.get(`${config.baseUrl.replace(/\/$/, '')}/v1/videos/${taskId}`, {
                headers: { 'Authorization': `Bearer ${config.token}` }
            });
            
            const data = response.data;
            queryResult.value = data;
            
            addLog(`状态更新: [${data.status}] 进度: ${data.progress || 0}%`, 
                data.status === 'completed' ? 'success' : (data.status === 'failed' ? 'error' : 'info')
            );

            if (data.status === 'completed' || data.status === 'failed') {
                isAutoRefreshing.value = false; 
                if (data.status === 'completed') addLog('任务已完成!', 'success');
                if (data.status === 'failed') addLog('任务执行失败.', 'error');
                return;
            }
            
            if (isAutoRefreshing.value) {
                pollingTimer.value = setTimeout(poll, interval);
            }
            
        } catch (err) {
            console.error("Polling error:", err);
            addLog(`轮询请求出错: ${err.message}`, 'warning');
                if (isAutoRefreshing.value) {
                pollingTimer.value = setTimeout(poll, interval);
                }
        }
    };
    
    pollingTimer.value = setTimeout(poll, 1000); 
};

const toggleAutoRefresh = () => {
    if (isAutoRefreshing.value) {
        stopPolling();
    } else {
        startPolling(queryTaskId.value);
    }
};

const queryTask = async () => {
    stopPolling();

    if (!queryTaskId.value) return;
    
    loading.query = true;
    error.query = null;
    addLog(`手动查询任务: ${queryTaskId.value}`, 'info');
    
    try {
        const response = await axios.get(`${config.baseUrl.replace(/\/$/, '')}/v1/videos/${queryTaskId.value}`, {
            headers: {
                'Authorization': `Bearer ${config.token}`
            }
        });
        
        queryResult.value = response.data;
        addLog(`查询成功: [${response.data.status}]`, 'success');
    } catch (err) {
        console.error(err);
        const errMsg = err.response ? 
            `Error ${err.response.status}: ${JSON.stringify(err.response.data)}` : 
            err.message;
        error.query = errMsg;
        addLog(`查询失败: ${errMsg}`, 'error');
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
                <p class="text-lg text-gray-600">基于 Tuzi API 的高性能异步生图/视频工具</p>
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
                                <input v-model="config.baseUrl" type="text" placeholder="https://api.tu-zi.com" class="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm">
                            </div>
                            <div>
                                <label class="block text-xs font-semibold text-gray-500 uppercase mb-1">Token</label>
                                <input v-model="config.token" :type="showToken ? 'text' : 'password'" placeholder="sk-..." class="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm">
                                <div class="mt-2">
                                    <button type="button" @click="showToken = !showToken" class="text-sm text-indigo-600 hover:text-indigo-800">{{ showToken ? '隐藏' : '显示' }}</button>
                                </div>
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
                        <!-- Tabs -->
                        <div class="flex border-b border-gray-200">
                            <button 
                                @click="activeTab = 'image'"
                                :class="activeTab === 'image' ? 'bg-indigo-600 text-white' : 'bg-gray-50 text-gray-500 hover:text-gray-700'"
                                class="w-1/2 py-4 text-center text-sm font-bold transition-colors">
                                🖼️ 图像生成
                            </button>
                            <button 
                                @click="activeTab = 'video'"
                                :class="activeTab === 'video' ? 'bg-purple-600 text-white' : 'bg-gray-50 text-gray-500 hover:text-gray-700'"
                                class="w-1/2 py-4 text-center text-sm font-bold transition-colors">
                                🎬 视频生成
                            </button>
                        </div>
                        
                        <div class="bg-indigo-600 h-1" :class="activeTab === 'video' ? 'bg-purple-600' : 'bg-indigo-600'"></div>
                        
                        <!-- Content -->
                        <div v-show="activeTab === 'image'">
                            <ImageForm :loading="loading.submit" @submit="submitTask" />
                        </div>
                        <div v-show="activeTab === 'video'">
                            <VideoForm :loading="loading.submit" @submit="submitTask" />
                        </div>
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
                                     <input v-model="queryTaskId" type="text" class="w-full pl-3 pr-10 py-2 border border-gray-300 rounded-md focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm" placeholder="任务 ID">
                                     <div class="absolute inset-y-0 right-0 flex items-center bg-transparent">
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
                                    {{ isAutoRefreshing ? '停止' : '轮询' }}
                                </button>
                            </div>
                        </div>

                        <!-- Logs Console -->
                        <LogConsole :logs="logs" />

                        <!-- Result Display -->
                        <ResultDisplay :result="queryResult" :loading="loading.submit || loading.query" :mode="activeTab" />
                        
                        <!-- Metadata -->
                         <div v-if="queryResult" class="mt-4 grid grid-cols-2 sm:grid-cols-4 gap-4 p-4 bg-gray-50 rounded-xl text-xs sm:text-sm border border-gray-100">
                             <div>
                                 <span class="block text-gray-400 font-medium uppercase tracking-wider text-[10px]">Status</span>
                                 <span :class="{'text-green-600': queryResult.status === 'completed', 'text-yellow-600': queryResult.status === 'processing' || queryResult.status === 'queued', 'text-red-600': queryResult.status === 'failed'}" class="font-bold flex items-center">
                                     <span v-if="queryResult.status === 'processing' || queryResult.status === 'queued'" class="w-2 h-2 rounded-full bg-yellow-400 mr-1.5 animate-pulse"></span>
                                     {{ queryResult.status }}
                                 </span>
                             </div>
                             <div>
                                 <span class="block text-gray-400 font-medium uppercase tracking-wider text-[10px]">Progress</span>
                                 <span class="font-medium text-gray-700">{{ queryResult.progress || 0 }}%</span>
                             </div>
                              <div class="col-span-2 sm:col-span-2">
                                 <span class="block text-gray-400 font-medium uppercase tracking-wider text-[10px]">Created</span>
                                 <span class="font-mono text-gray-600">{{ queryResult.created_at ? new Date(queryResult.created_at * 1000).toLocaleString() : '-' }}</span>
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
