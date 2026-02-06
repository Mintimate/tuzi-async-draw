<script setup>
import axios from 'axios';
import { nextTick, onMounted, onUnmounted, reactive, ref, watch } from 'vue';
import { useI18n } from 'vue-i18n';
import ImageForm from './components/ImageForm.vue';
import LogConsole from './components/LogConsole.vue';
import PasskeyManager from './components/PasskeyManager.vue';
import ResultDisplay from './components/ResultDisplay.vue';
import SiteStats from './components/SiteStats.vue';
import UsageGuide from './components/UsageGuide.vue';
import VideoForm from './components/VideoForm.vue';

const { t, locale } = useI18n();

const toggleLang = () => {
    locale.value = locale.value === 'zh' ? 'en' : 'zh';
    localStorage.setItem('tuzi_lang', locale.value);
};

// Theme Mode
const themeMode = ref(localStorage.getItem('tuzi_theme_mode') || 'auto'); // 'light' | 'dark' | 'auto'

const applyTheme = () => {
    const isDark = themeMode.value === 'dark' || 
                  (themeMode.value === 'auto' && window.matchMedia('(prefers-color-scheme: dark)').matches);
    
    if (isDark) {
        document.documentElement.classList.add('dark');
    } else {
        document.documentElement.classList.remove('dark');
    }
};

const toggleTheme = (mode, event) => {
    // 如果不支持 View Transitions 或没有事件对象，直接切换
    if (!document.startViewTransition || !event) {
        themeMode.value = mode;
        return;
    }

    const x = event.clientX;
    const y = event.clientY;
    const endRadius = Math.hypot(
        Math.max(x, window.innerWidth - x),
        Math.max(y, window.innerHeight - y)
    );

    const transition = document.startViewTransition(async () => {
        themeMode.value = mode;
        await nextTick();
    });

    transition.ready.then(() => {
        const clipPath = [
            `circle(0px at ${x}px ${y}px)`,
            `circle(${endRadius}px at ${x}px ${y}px)`
        ];
        document.documentElement.animate(
            {
                clipPath: clipPath,
            },
            {
                duration: 500,
                easing: 'ease-in',
                pseudoElement: '::view-transition-new(root)',
            }
        );
    });
};

// 监听系统主题变化
const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
const handleSystemThemeChange = () => {
    if (themeMode.value === 'auto') applyTheme();
};

// Token persistence
const persistToken = ref(localStorage.getItem('tuzi_persist_token') === 'true');

// 检查 URL 参数中的 token
const urlParams = new URLSearchParams(window.location.search);
const urlToken = urlParams.get('token');

// 如果存在 URL Token 且开启了持久化，立即更新 localStorage
if (urlToken && persistToken.value) {
    localStorage.setItem('tuzi_api_token', urlToken);
}

const config = reactive({
    baseUrl: localStorage.getItem('tuzi_api_base_url') || 'https://api.tu-zi.com',
    token: urlToken || (persistToken.value ? (localStorage.getItem('tuzi_api_token') || '') : '')
});

// Token visibility
const showToken = ref(false);

// Passkey Status
const isPasskeyEnabled = ref(false);
const statsRef = ref(null);

const checkPasskeyStatus = async () => {
    try {
        const response = await fetch('/api/system');
        if (response.ok) {
            const data = await response.json();
            isPasskeyEnabled.value = !!(data.config && data.config.kvEnabled);
        }
    } catch (err) {
        console.error('Failed to check passkey status:', err);
        isPasskeyEnabled.value = false;
    }
};

onMounted(() => {
    applyTheme();
    mediaQuery.addEventListener('change', handleSystemThemeChange);
    checkPasskeyStatus();
});

onUnmounted(() => {
    mediaQuery.removeEventListener('change', handleSystemThemeChange);
});

// Passkey 登录回调
const handlePasskeyLogin = ({ username, token }) => {
    config.token = token;
    addLog(t('logs.passkeySuccess', { username }), 'success');
};

// Passkey 日志回调
const handlePasskeyLog = (content, type) => {
    addLog(content, type);
};

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

// 状态格式化映射，帮助把后端不一致的 status 转成人类可读的中文与样式
const statusInfo = (s) => {
    const n = (s || '').toString().toLowerCase();
    if (n === 'completed') return { label: t('status.completed'), colorClass: 'text-green-600', icon: '✅', pulse: false, level: 'success' };
    if (n === 'failed' || n === 'error') return { label: t('status.failed'), colorClass: 'text-red-600', icon: '❌', pulse: false, level: 'error' };
    if (n === 'queued' || n === 'waiting' || n === 'created') return { label: t('status.queued'), colorClass: 'text-yellow-600', icon: '⏳', pulse: true, level: 'info' };
    if (n === 'processing' || n === 'in_progress' || n === 'inpropress' || n === 'in_propress' || n === 'running') return { label: t('status.processing'), colorClass: 'text-yellow-600', icon: '⚙️', pulse: true, level: 'info' };
    return { label: s || '-', colorClass: 'text-gray-600', icon: '', pulse: false, level: 'info' };
};

// 自动保存配置
watch(() => config.baseUrl, (val) => localStorage.setItem('tuzi_api_base_url', val));

watch(() => config.token, (val) => {
    if (persistToken.value) {
        localStorage.setItem('tuzi_api_token', val);
    }
});

watch(persistToken, (val) => {
    localStorage.setItem('tuzi_persist_token', val);
    if (val) {
        localStorage.setItem('tuzi_api_token', config.token);
    } else {
        localStorage.removeItem('tuzi_api_token');
    }
});

watch(themeMode, (val) => {
    localStorage.setItem('tuzi_theme_mode', val);
    applyTheme();
});

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
    // queryTaskId.value = '';
    logs.value = [];
    stopPolling();
    addLog(t('logs.switchMode', { mode: activeTab.value === 'image' ? t('logs.imageMode') : t('logs.videoMode') }), 'info');
});

const submitTask = async (formDataObj) => {
    loading.submit = true;
    error.submit = null;
    submitResult.value = null;
    logs.value = []; 
    addLog(t('logs.startTask', { model: formDataObj.model }), 'info');

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
                addLog(t('logs.addRefImage', { name: file.name }), 'info');
            });
        } else if (formDataObj.imageUrl) {
            const urls = formDataObj.imageUrl.split(/[\n,\s]+/).map(u => u.trim()).filter(u => u);
            urls.forEach(url => {
                formData.append('input_reference', url);
                addLog(t('logs.addRefUrl', { url }), 'info');
            });
        }

        // mask 逻辑
        if (formDataObj.mask) {
            formData.append('mask', formDataObj.mask);
            addLog(t('logs.addMask', { name: formDataObj.mask.name }), 'info');
        }

        addLog(t('logs.submitting'), 'info');

        const response = await axios.post(`${config.baseUrl.replace(/\/$/, '')}/v1/videos`, formData, {
            headers: {
                'Authorization': `Bearer ${config.token}`,
                'Content-Type': 'multipart/form-data'
            }
        });

        submitResult.value = response.data;
        addLog(t('logs.submitSuccess', { id: response.data.id }), 'success');
        addLog(t('logs.waitAlert'), 'success');

        // 报告生成统计
        if (statsRef.value) {
            statsRef.value.reportImageGen();
        }

        if (response.data.id) {
            queryTaskId.value = response.data.id;
            addLog(t('logs.startPolling'), 'info');
            startPolling(response.data.id);
        }
    } catch (err) {
        console.error(err);
        const errMsg = err.response ? 
            `Error ${err.response.status}: ${JSON.stringify(err.response.data)}` : 
            err.message;
        error.submit = errMsg;
        addLog(t('logs.submitFail', { message: errMsg }), 'error');
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
            
            const st = statusInfo(data.status);
            addLog(t('logs.statusUpdate', { icon: st.icon, label: st.label, status: data.status }), st.level);

            if (data.status === 'completed' || data.status === 'failed') {
                isAutoRefreshing.value = false;
                if (data.status === 'completed') addLog(t('logs.taskCompleted', { icon: statusInfo(data.status).icon }), 'success');
                if (data.status === 'failed') addLog(t('logs.taskFailed', { icon: statusInfo(data.status).icon }), 'error');
                return;
            }
            
            if (isAutoRefreshing.value) {
                pollingTimer.value = setTimeout(poll, interval);
            }
            
        } catch (err) {
            console.error("Polling error:", err);
            addLog(t('logs.pollError', { message: err.message }), 'warning');
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
    addLog(t('logs.manualQuery', { id: queryTaskId.value }), 'info');
    
    try {
        const response = await axios.get(`${config.baseUrl.replace(/\/$/, '')}/v1/videos/${queryTaskId.value}`, {
            headers: {
                'Authorization': `Bearer ${config.token}`
            }
        });
        
        queryResult.value = response.data;
        addLog(t('logs.querySuccess', { icon: statusInfo(response.data.status).icon, label: statusInfo(response.data.status).label, status: response.data.status }), 'success');
    } catch (err) {
        console.error(err);
        const errMsg = err.response ? 
            `Error ${err.response.status}: ${JSON.stringify(err.response.data)}` : 
            err.message;
        error.query = errMsg;
        addLog(t('logs.queryFail', { message: errMsg }), 'error');
    } finally {
        loading.query = false;
    }
};
</script>

<template>
    <div class="min-h-screen bg-gray-50 dark:bg-gray-900 py-12 px-4 sm:px-6 lg:px-8 relative overflow-hidden transition-colors duration-500 selection:bg-indigo-500 selection:text-white">
        <!-- Language Switcher (Top Right) -->
        <div class="absolute top-4 right-4 z-50">
            <button 
                @click="toggleLang" 
                class="flex items-center justify-center px-3 py-2 rounded-lg transition-all duration-300 bg-white/80 dark:bg-gray-800/80 backdrop-blur-xl text-gray-600 hover:text-indigo-600 dark:text-gray-300 dark:hover:text-indigo-400 border border-gray-200 dark:border-gray-700 shadow-sm hover:shadow-md group" 
                :title="locale === 'zh' ? 'Switch to English' : '切换到中文'">
                <span class="text-sm font-bold group-hover:scale-110 transition-transform">{{ locale === 'zh' ? 'EN' : '中' }}</span>
            </button>
        </div>

        <!-- Background Decoration -->
        <div class="fixed inset-0 overflow-hidden pointer-events-none">
            <div class="absolute top-0 left-1/4 w-96 h-96 bg-purple-300/30 dark:bg-purple-900/20 rounded-full mix-blend-multiply dark:mix-blend-screen filter blur-3xl opacity-70 animate-blob"></div>
            <div class="absolute top-0 right-1/4 w-96 h-96 bg-yellow-300/30 dark:bg-yellow-900/20 rounded-full mix-blend-multiply dark:mix-blend-screen filter blur-3xl opacity-70 animate-blob animation-delay-2000"></div>
            <div class="absolute -bottom-32 left-1/3 w-96 h-96 bg-pink-300/30 dark:bg-pink-900/20 rounded-full mix-blend-multiply dark:mix-blend-screen filter blur-3xl opacity-70 animate-blob animation-delay-4000"></div>
        </div>

        <div class="max-w-7xl mx-auto relative z-10">
            <!-- Header -->
            <header class="text-center mb-12 flex flex-col items-center">
                <div class="flex items-center gap-4 mb-2 justify-center">
                    <h1 class="text-4xl font-extrabold text-transparent bg-clip-text bg-gradient-to-r from-indigo-600 to-purple-600">
                        {{ t('app.title') }}
                    </h1>
                    <!-- Theme Selector -->
                    <div class="flex items-center p-1 bg-gray-200 dark:bg-gray-700 rounded-lg transition-colors border border-gray-300 dark:border-gray-600">
                        <button 
                            @click="toggleTheme('light', $event)" 
                            :class="themeMode === 'light' ? 'bg-white dark:bg-gray-600 shadow-sm text-indigo-600 dark:text-indigo-400' : 'text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200'"
                            class="p-1.5 rounded-md transition-all duration-200" 
                            :title="t('app.theme.light')">
                            <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 3v1m0 16v1m9-9h-1M4 9h-1m15.364 6.364l-.707-.707M6.343 6.343l-.707-.707m12.728 0l-.707.707M6.343 17.657l-.707.707M16 12a4 4 0 11-8 0 4 4 0 018 0z"></path></svg>
                        </button>
                        <button 
                            @click="toggleTheme('auto', $event)" 
                            :class="themeMode === 'auto' ? 'bg-white dark:bg-gray-600 shadow-sm text-indigo-600 dark:text-indigo-400' : 'text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200'"
                            class="p-1.5 rounded-md transition-all duration-200" 
                            :title="t('app.theme.auto')">
                            <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9.75 17L9 20l-1 1h8l-1-1-.75-3M3 13h18M5 17h14a2 2 0 002-2V5a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z"></path></svg>
                        </button>
                        <button 
                            @click="toggleTheme('dark', $event)" 
                            :class="themeMode === 'dark' ? 'bg-white dark:bg-gray-600 shadow-sm text-indigo-600 dark:text-indigo-400' : 'text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200'"
                            class="p-1.5 rounded-md transition-all duration-200" 
                            :title="t('app.theme.dark')">
                            <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M20.354 15.354A9 9 0 018.646 3.646 9.003 9.003 0 0012 21a9.003 9.003 0 008.354-5.646z"></path></svg>
                        </button>
                    </div>
                </div>
                <p class="mt-3 text-base sm:text-lg text-gray-600 dark:text-gray-400 max-w-2xl mx-auto leading-relaxed" v-html="t('app.description')">
                </p>
            </header>

            <div class="grid grid-cols-1 lg:grid-cols-3 gap-8">
                <!-- Left Column: Settings & Create -->
                <div class="lg:col-span-1 space-y-6">
                    
                    <!-- Global Config Card -->
                    <div class="bg-white/80 dark:bg-gray-800/80 backdrop-blur-xl rounded-2xl shadow-sm border border-gray-100 dark:border-gray-700 overflow-hidden transition-all duration-300 hover:shadow-md">
                        <div class="bg-gray-50/50 dark:bg-gray-700/50 px-6 py-4 border-b border-gray-100 dark:border-gray-600">
                            <h2 class="text-sm font-semibold text-gray-900 dark:text-gray-100 uppercase tracking-wider">
                                ⚙️ {{ t('config.title') }}
                            </h2>
                        </div>
                        <div class="p-6 space-y-4">
                            <div>
                                <label class="block text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase mb-1">{{ t('config.baseUrl') }}</label>
                                <input v-model="config.baseUrl" type="text" placeholder="https://api.tu-zi.com" class="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100">
                            </div>
                            <div>
                                <label class="block text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase mb-1">{{ t('config.token') }}</label>
                                <div class="flex items-center w-full rounded-md border border-gray-300 dark:border-gray-600 shadow-sm focus-within:border-indigo-500 focus-within:ring-1 focus-within:ring-indigo-500 bg-white dark:bg-gray-700">
                                    <input v-model="config.token" :type="showToken ? 'text' : 'password'" placeholder="sk-..." class="flex-1 block w-full px-3 py-2 border-0 focus:ring-0 sm:text-sm bg-transparent dark:text-gray-100 rounded-l-md">
                                    <button type="button" @click="showToken = !showToken" class="px-3 py-2 text-gray-400 hover:text-indigo-600 focus:outline-none rounded-r-md flex items-center" :title="t('config.showToken')">
                                        <svg v-if="showToken" class="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268 2.943 9.543 7a10.025 10.025 0 01-4.132 5.411m0 0L21 21" /></svg>
                                        <svg v-else class="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" /><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" /></svg>
                                    </button>
                                </div>
                                
                                <div v-if="urlToken && config.token === urlToken" class="mt-1 text-xs text-green-600 flex items-center">
                                    <svg class="w-3 h-3 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7"></path></svg>
                                    {{ t('config.autoFilled') }}
                                </div>
                                
                                <div class="flex items-center mt-2">
                                    <input id="persist-token" type="checkbox" v-model="persistToken" class="h-4 w-4 text-indigo-600 focus:ring-indigo-500 border-gray-300 dark:border-gray-600 rounded dark:bg-gray-700">
                                    <label for="persist-token" class="ml-2 block text-xs text-gray-500 dark:text-gray-400">
                                        {{ t('config.persistToken') }}
                                    </label>
                                </div>

                                <!-- Passkey 快捷入口 -->
                                <div v-if="isPasskeyEnabled" class="mt-3">
                                    <PasskeyManager 
                                        :base-url="config.baseUrl" 
                                        :current-token="config.token"
                                        @login="handlePasskeyLogin"
                                        @log="handlePasskeyLog"
                                    />
                                </div>
                            </div>

                            <div class="pt-2 text-xs flex flex-col gap-2">
                                <a href="https://api.tu-zi.com/register?aff=SJ33" target="_blank" class="text-indigo-600 dark:text-indigo-400 hover:text-indigo-800 dark:hover:text-indigo-300 hover:underline flex items-center gap-1.5 transition-colors">
                                    <svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M18 9v3m0 0v3m0-3h3m-3 0h-3m-2-5a4 4 0 11-8 0 4 4 0 018 0zM3 20a6 6 0 0112 0v1H3v-1z"></path></svg>
                                    {{ t('config.register') }}
                                </a>
                                <a href="https://tuzi-api.apifox.cn/412175236e0" target="_blank" class="text-gray-500 dark:text-gray-400 hover:text-indigo-600 dark:hover:text-indigo-400 hover:underline flex items-center gap-1.5 transition-colors">
                                    <svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"></path></svg>
                                    {{ t('config.docs') }}
                                </a>
                            </div>
                        </div>
                    </div>

                    <!-- Create Task Card -->
                    <div class="bg-white/80 dark:bg-gray-800/80 backdrop-blur-xl rounded-2xl shadow-xl shadow-indigo-100/50 dark:shadow-indigo-900/30 border border-gray-100 dark:border-gray-700 overflow-hidden transition-all duration-300 hover:shadow-2xl hover:shadow-indigo-200/50 dark:hover:shadow-indigo-900/50">
                        <!-- Tabs -->
                        <div class="flex border-b border-gray-200 dark:border-gray-700">
                            <button 
                                @click="activeTab = 'image'"
                                :class="activeTab === 'image' ? 'bg-indigo-600 text-white' : 'bg-gray-50/50 dark:bg-gray-700/50 text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-600'"
                                class="w-1/2 py-4 text-center text-sm font-bold transition-all duration-200">
                                🖼️ {{ t('tabs.image') }}
                            </button>
                            <button 
                                @click="activeTab = 'video'"
                                :class="activeTab === 'video' ? 'bg-purple-600 text-white' : 'bg-gray-50/50 dark:bg-gray-700/50 text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-600'"
                                class="w-1/2 py-4 text-center text-sm font-bold transition-all duration-200">
                                🎬 {{ t('tabs.video') }}
                            </button>
                        </div>
                        
                        <div class="bg-indigo-600 h-1" :class="activeTab === 'video' ? 'bg-purple-600' : 'bg-indigo-600'"></div>
                        
                        <!-- Content -->
                        <div v-show="activeTab === 'image'">
                            <ImageForm 
                                :loading="loading.submit" 
                                :isActive="activeTab === 'image'"
                                @submit="submitTask" 
                                @log="({content, type}) => addLog(content, type)"
                            />
                        </div>
                        <div v-show="activeTab === 'video'">
                            <VideoForm 
                                :loading="loading.submit" 
                                :isActive="activeTab === 'video'"
                                @submit="submitTask" 
                                @log="({content, type}) => addLog(content, type)"
                            />
                        </div>
                    </div>
                </div>

                <!-- Right Column: Status & Preview -->
                <div class="lg:col-span-2 space-y-6">
                    
                    <!-- Status Card -->
                    <div class="bg-white/80 dark:bg-gray-800/80 backdrop-blur-xl rounded-2xl shadow-sm border border-gray-100 dark:border-gray-700 p-6 transition-all duration-300 hover:shadow-md">
                        <div class="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 border-b border-gray-100 dark:border-gray-700 pb-4 mb-4">
                            <h2 class="text-xl font-bold text-gray-900 dark:text-gray-100">{{ t('status.title') }}</h2>
                            <div class="flex gap-2">
                                <div class="flex items-center rounded-md border border-gray-300 dark:border-gray-600 shadow-sm w-full sm:w-64 focus-within:border-indigo-500 focus-within:ring-1 focus-within:ring-indigo-500 bg-white dark:bg-gray-700">
                                    <input v-model="queryTaskId" type="text" class="flex-1 block w-full px-3 py-2 border-none focus:ring-0 sm:text-sm bg-transparent dark:text-gray-100 rounded-l-md" :placeholder="t('status.taskIdPlaceholder')">
                                    <button type="button" @click="queryTask" :disabled="!queryTaskId || loading.query" class="px-3 py-2 text-gray-400 hover:text-indigo-600 focus:outline-none rounded-r-md flex items-center" :title="t('status.query')">
                                        <svg class="w-5 h-5" :class="{'animate-spin': loading.query}" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"></path></svg>
                                    </button>
                                </div>
                                <button @click="toggleAutoRefresh" :disabled="!queryTaskId" 
                                    :class="isAutoRefreshing ? 'bg-red-50 dark:bg-red-900/30 text-red-600 dark:text-red-400 hover:bg-red-100 dark:hover:bg-red-900/50 border-red-200 dark:border-red-800' : 'bg-gray-50 dark:bg-gray-700 text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-600 border-gray-200 dark:border-gray-600'"
                                    class="inline-flex items-center px-4 py-2 border rounded-md shadow-sm text-sm font-medium focus:outline-none transition-colors">
                                    <span v-if="isAutoRefreshing" class="relative flex h-2 w-2 mr-2">
                                      <span class="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75"></span>
                                      <span class="relative inline-flex rounded-full h-2 w-2 bg-red-500"></span>
                                    </span>
                                    {{ isAutoRefreshing ? t('status.stop') : t('status.poll') }}
                                </button>
                            </div>
                        </div>

                        <!-- Logs Console -->
                        <LogConsole v-if="!queryResult || logs.length > 0" :logs="logs" />

                        <!-- Usage Guide -->
                        <UsageGuide v-if="!queryResult && logs.length === 0 && !loading.submit && !loading.query" />

                        <!-- Result Display -->
                        <ResultDisplay :result="queryResult" :loading="loading.submit || loading.query" :mode="activeTab" />
                        
                        <!-- Metadata -->
                         <div v-if="queryResult" class="mt-4 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 p-4 bg-gray-50 dark:bg-gray-700 rounded-xl text-xs sm:text-sm border border-gray-100 dark:border-gray-600">
                             <div>
                                 <span class="block text-gray-400 dark:text-gray-500 font-medium uppercase tracking-wider text-[10px] mb-1">{{ t('result.status') }}</span>
                                 <span :class="statusInfo(queryResult.status).colorClass" class="font-bold flex items-center">
                                     <span v-if="statusInfo(queryResult.status).pulse" class="relative flex h-2 w-2 mr-2">
                                         <span class="animate-ping absolute inline-flex h-full w-full rounded-full bg-yellow-400 opacity-75"></span>
                                         <span class="relative inline-flex rounded-full h-2 w-2 bg-yellow-400"></span>
                                     </span>
                                     <span class="mr-2">{{ statusInfo(queryResult.status).icon }}</span>
                                     <span>{{ statusInfo(queryResult.status).label }}</span>
                                     <span class="text-gray-400 dark:text-gray-500 ml-2 text-xs">({{ queryResult.status }})</span>
                                 </span>
                             </div>
                             <div>
                                 <span class="block text-gray-400 dark:text-gray-500 font-medium uppercase tracking-wider text-[10px] mb-1">{{ t('result.progress') }}</span>
                                 <div class="w-full">
                                     <div class="w-full bg-gray-200 dark:bg-gray-600 rounded-full h-3 overflow-hidden">
                                         <div :style="{ width: (queryResult.progress || 0) + '%' }" class="h-full bg-indigo-500"></div>
                                     </div>
                                     <div class="mt-1 text-xs text-gray-500 dark:text-gray-400">{{ queryResult.progress || 0 }}%</div>
                                 </div>
                             </div>
                             <div class="sm:col-span-2 lg:col-span-2">
                                 <span class="block text-gray-400 dark:text-gray-500 font-medium uppercase tracking-wider text-[10px] mb-1">{{ t('result.created') }}</span>
                                 <span class="font-mono text-gray-600 dark:text-gray-300">{{ queryResult.created_at ? new Date(queryResult.created_at).toLocaleString() : '-' }}</span>
                             </div>
                         </div>

                    </div>
                    
                </div>
            </div>
            
            <!-- Footer -->
            <footer class="mt-12 text-center border-t border-gray-200 dark:border-gray-700 pt-8 pb-8">
                <!-- Site Stats Component -->
                <SiteStats ref="statsRef" />

                <div class="flex justify-center items-center gap-6 mb-4">
                    <a href="https://github.com/Mintimate/tuzi-async-studio" target="_blank" class="flex items-center text-sm font-medium text-gray-500 dark:text-gray-400 hover:text-indigo-600 dark:hover:text-indigo-400 transition-colors">
                        <svg class="w-4 h-4 mr-2" fill="currentColor" viewBox="0 0 24 24" aria-hidden="true"><path fill-rule="evenodd" d="M12 2C6.477 2 2 6.484 2 12.017c0 4.425 2.865 8.18 6.839 9.504.5.092.682-.217.682-.483 0-.237-.008-.868-.013-1.703-2.782.605-3.369-1.343-3.369-1.343-.454-1.158-1.11-1.466-1.11-1.466-.908-.62.069-.608.069-.608 1.003.07 1.531 1.032 1.531 1.032.892 1.53 2.341 1.088 2.91.832.092-.647.35-1.088.636-1.338-2.22-.253-4.555-1.113-4.555-4.951 0-1.093.39-1.988 1.029-2.688-.103-.253-.446-1.272.098-2.65 0 0 .84-.27 2.75 1.026A9.564 9.564 0 0112 6.844c.85.004 1.705.115 2.504.337 1.909-1.296 2.747-1.027 2.747-1.027.546 1.379.202 2.398.1 2.651.64.7 1.028 1.595 1.028 2.688 0 3.848-2.339 4.695-4.566 4.943.359.309.678.92.678 1.855 0 1.338-.012 2.419-.012 2.747 0 .268.18.58.688.482A10.019 10.019 0 0022 12.017C22 6.484 17.522 2 12 2z" clip-rule="evenodd" /></svg>
                        {{ t('footer.github') }}
                    </a>
                    <span class="text-gray-300 dark:text-gray-600">|</span>
                    <a href="https://cnb.cool/Mintimate/tool-forge/tuzi-async-studio" target="_blank" class="flex items-center text-sm font-medium text-gray-500 dark:text-gray-400 hover:text-indigo-600 dark:hover:text-indigo-400 transition-colors">
                        <svg class="w-4 h-4 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" /></svg>
                        {{ t('footer.mirror') }}
                    </a>
                </div>
                <p class="text-sm text-gray-400 dark:text-gray-500">
                    {{ t('footer.designedBy') }} <a href="https://www.mintimate.cn" target="_blank" class="font-medium text-gray-500 dark:text-gray-400 hover:text-indigo-600 dark:hover:text-indigo-400 transition-colors">Mintimate</a>
                    <span class="mx-2">·</span>
                    {{ t('footer.poweredBy') }} EdgeOne Pages
                </p>
            </footer>
        </div>
    </div>
</template>

<style>
::view-transition-old(root),
::view-transition-new(root) {
  animation: none;
  mix-blend-mode: normal;
}

@keyframes blob {
  0% { transform: translate(0px, 0px) scale(1); }
  33% { transform: translate(30px, -50px) scale(1.1); }
  66% { transform: translate(-20px, 20px) scale(0.9); }
  100% { transform: translate(0px, 0px) scale(1); }
}
.animate-blob {
  animation: blob 7s infinite;
}
.animation-delay-2000 {
  animation-delay: 2s;
}
.animation-delay-4000 {
  animation-delay: 4s;
}
</style>
