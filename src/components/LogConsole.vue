<script setup>
import { nextTick, ref, watch } from 'vue';
import { useI18n } from 'vue-i18n';

const { t } = useI18n();

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
    <div class="bg-gray-900 dark:bg-gray-950 rounded-xl shadow-inner border border-gray-800 dark:border-gray-900 p-4 mb-6 font-mono text-xs sm:text-sm h-64 overflow-y-auto custom-scrollbar flex flex-col" ref="logConsoleRef">
        <div v-if="logs.length === 0" class="flex flex-col items-center justify-center h-full text-gray-400 dark:text-gray-500 select-none">
            <pre class="mb-3 text-sm sm:text-base leading-tight font-mono text-gray-300 dark:text-gray-400 select-none text-center ascii-cat">(\_/)
( <span class="eye">o</span>.<span class="eye">o</span> )
/> <\</pre>
            <span class="animate-pulse mb-2">{{ t('logConsole.waiting') }}</span>
            <a href="https://afdian.com/a/mintimate" target="_blank" class="text-xs text-purple-200 dark:text-purple-300 hover:text-purple-400 dark:hover:text-purple-200 transition-colors mt-1">
                {{ t('logConsole.support') }}
            </a>
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

<style scoped>
/* ASCII cat eye blinking */
.eye {
  display: inline-block;
  transform-origin: center center;
  animation: blink 4s infinite;
}
@keyframes blink {
  0%, 92%, 100% { transform: scaleY(1); }
  93%, 95% { transform: scaleY(0.05); }
}
/* Slight float to make the cat feel alive */
@keyframes float {
  0%, 100% { transform: translateY(0); }
  50% { transform: translateY(-2px); }
}
.ascii-cat { display: inline-block; animation: float 3s ease-in-out infinite; }
</style>
