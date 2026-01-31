<script setup>
import { ref, watch, nextTick } from 'vue';

const props = defineProps({
    logs: {
        type: Array,
        required: true
    }
});

const logConsoleRef = ref(null);

watch(() => props.logs.length, () => {
    nextTick(() => {
        if (logConsoleRef.value) {
            logConsoleRef.value.scrollTop = logConsoleRef.value.scrollHeight;
        }
    });
});
</script>

<template>
    <div class="bg-gray-900 rounded-xl shadow-inner border border-gray-800 p-4 mb-6 font-mono text-xs sm:text-sm h-64 overflow-y-auto custom-scrollbar flex flex-col" ref="logConsoleRef">
        <div v-if="logs.length === 0" class="flex items-center justify-center h-full text-gray-700 select-none">
            <span class="animate-pulse">等待任务启动...</span>
        </div>
        <div v-for="log in logs" :key="log.id" class="mb-1 break-all flex items-start">
            <span class="text-gray-500 mr-2 shrink-0 select-none">[{{ log.time }}]</span>
            <span :class="{
                'text-blue-400': log.type === 'info',
                'text-green-400': log.type === 'success',
                'text-red-400': log.type === 'error',
                'text-yellow-400': log.type === 'warning'
            }">
                <span v-if="log.type === 'info'" class="mr-1">ℹ️</span>
                <span v-else-if="log.type === 'success'" class="mr-1">✅</span>
                <span v-else-if="log.type === 'error'" class="mr-1">❌</span>
                <span v-else-if="log.type === 'warning'" class="mr-1">⚠️</span>
                {{ log.content }}
            </span>
        </div>
    </div>
</template>
