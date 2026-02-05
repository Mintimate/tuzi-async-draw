<script setup>
import { onUnmounted, ref, watch } from 'vue';

const props = defineProps({
  imageFile: {
    type: File,
    required: true
  }
});

const imageUrl = ref('');
const imageRef = ref(null);
const canvasRef = ref(null);
const containerRef = ref(null);
const isDrawing = ref(false);
const brushSize = ref(40);
const ctx = ref(null);
const lastX = ref(0);
const lastY = ref(0);

// 生成图片 URL
watch(() => props.imageFile, (newFile) => {
  if (imageUrl.value) URL.revokeObjectURL(imageUrl.value);
  if (newFile) {
    imageUrl.value = URL.createObjectURL(newFile);
  } else {
    imageUrl.value = '';
  }
}, { immediate: true });

onUnmounted(() => {
  if (imageUrl.value) URL.revokeObjectURL(imageUrl.value);
});

const onImageLoad = () => {
  if (!imageRef.value || !canvasRef.value) return;
  
  const img = imageRef.value;
  const canvas = canvasRef.value;
  
  // 设置 canvas 尺寸与图片实际显示尺寸一致（或者与自然尺寸一致，这里选择自然尺寸以保证精度）
  canvas.width = img.naturalWidth;
  canvas.height = img.naturalHeight;
  
  // 设置 canvas 显示尺寸跟随图片
  canvas.style.width = '100%';
  canvas.style.height = '100%';
  
  ctx.value = canvas.getContext('2d');
  ctx.value.lineCap = 'round';
  ctx.value.lineJoin = 'round';
  ctx.value.strokeStyle = '#ff0000'; // 纯红色，不透明
  ctx.value.shadowColor = '#ff0000'; // 阴影颜色同画笔
  ctx.value.shadowBlur = brushSize.value / 2; // 初始模糊度
};

const getCoordinates = (e) => {
  const canvas = canvasRef.value;
  const rect = canvas.getBoundingClientRect();
  
  let clientX, clientY;
  if (e.touches && e.touches.length > 0) {
    clientX = e.touches[0].clientX;
    clientY = e.touches[0].clientY;
  } else {
    clientX = e.clientX;
    clientY = e.clientY;
  }
  
  const scaleX = canvas.width / rect.width;
  const scaleY = canvas.height / rect.height;
  
  return {
    x: (clientX - rect.left) * scaleX,
    y: (clientY - rect.top) * scaleY
  };
};

const startDrawing = (e) => {
  isDrawing.value = true;
  const { x, y } = getCoordinates(e);
  lastX.value = x;
  lastY.value = y;
  
  // 画一个点
  draw(e);
};

const draw = (e) => {
  if (!isDrawing.value || !ctx.value) return;
  
  const { x, y } = getCoordinates(e);
  
  ctx.value.lineWidth = brushSize.value;
  ctx.value.shadowBlur = brushSize.value / 2; // 动态调整模糊度，模拟喷漆边缘
  ctx.value.beginPath();
  ctx.value.moveTo(lastX.value, lastY.value);
  ctx.value.lineTo(x, y);
  ctx.value.stroke();
  
  lastX.value = x;
  lastY.value = y;
};

const stopDrawing = () => {
  isDrawing.value = false;
};

const clearCanvas = () => {
  if (!ctx.value || !canvasRef.value) return;
  ctx.value.clearRect(0, 0, canvasRef.value.width, canvasRef.value.height);
};

// 导出蒙版 Blob
const getMaskBlob = () => {
  return new Promise((resolve) => {
    if (!canvasRef.value) {
      resolve(null);
      return;
    }
    
    // 创建一个离屏 canvas 生成最终的黑白蒙版
    const offScreenCanvas = document.createElement('canvas');
    offScreenCanvas.width = canvasRef.value.width;
    offScreenCanvas.height = canvasRef.value.height;
    const offCtx = offScreenCanvas.getContext('2d');
    
    // 填充黑色背景
    offCtx.fillStyle = '#000000';
    offCtx.fillRect(0, 0, offScreenCanvas.width, offScreenCanvas.height);
    
    // 将当前 canvas 的内容（红色半透明线条）以白色绘制上去
    // 我们可以利用 globalCompositeOperation 或者直接重绘路径（如果保存了路径）
    // 但最简单的是直接把当前 canvas 画上去，利用 source-over，但颜色要变。
    // 由于当前 canvas 已经是光栅化的，我们无法轻易改变颜色。
    // 更好的方法是：在绘制时，其实我们只关心 alpha 通道。
    // 我们可以遍历像素，或者使用 globalCompositeOperation。
    
    // 方法：将当前 canvas 绘制到 offScreenCanvas 上，使用 'source-over'。
    // 但我们需要把红色变成白色。
    // 可以设置 offCtx.fillStyle = 'white' 然后利用 destination-in ? 不行。
    
    // 简单粗暴的方法：
    // 1. 填充黑底。
    // 2. 把当前 canvas 画上去。
    // 3. 获取 imageData，把所有非黑色像素（即我们画的红色）转成白色。
    
    offCtx.drawImage(canvasRef.value, 0, 0);
    const imageData = offCtx.getImageData(0, 0, offScreenCanvas.width, offScreenCanvas.height);
    const data = imageData.data;
    
    for (let i = 0; i < data.length; i += 4) {
      // data[i] = R, data[i+1] = G, data[i+2] = B, data[i+3] = A
      // 我们的画笔是 rgba(255, 0, 0, 0.5)
      // 背景是黑色 (0, 0, 0, 255)
      // 混合后，R 分量会有值。
      // 只要 R > 0 或者 A > 0 (且不是背景)，就认为是蒙版区域。
      // 简单判断：如果像素不是纯黑（背景），就设为纯白。
      
      // 注意：由于我们先填充了黑色背景，透明度混合后，背景部分是 (0,0,0,255)。
      // 画笔部分是红色混合黑色。
      if (data[i] > 20) { // 红色分量大于阈值
        data[i] = 255;     // R
        data[i + 1] = 255; // G
        data[i + 2] = 255; // B
        data[i + 3] = 255; // A
      } else {
        data[i] = 0;
        data[i + 1] = 0;
        data[i + 2] = 0;
        data[i + 3] = 255;
      }
    }
    
    offCtx.putImageData(imageData, 0, 0);
    
    offScreenCanvas.toBlob((blob) => {
      resolve(blob);
    }, 'image/png');
  });
};

defineExpose({
  getMaskBlob,
  clearCanvas
});
</script>

<template>
  <div class="flex flex-col gap-3">
    <div class="relative border border-gray-300 dark:border-gray-600 rounded-lg overflow-hidden bg-gray-100 dark:bg-gray-800 select-none" ref="containerRef">
      <!-- 底图 -->
      <img ref="imageRef" :src="imageUrl" class="w-full h-auto block pointer-events-none" @load="onImageLoad" />
      <!-- 绘图层 -->
      <canvas 
        ref="canvasRef"
        class="absolute top-0 left-0 cursor-crosshair touch-none opacity-60"
        @mousedown="startDrawing"
        @mousemove="draw"
        @mouseup="stopDrawing"
        @mouseleave="stopDrawing"
        @touchstart.prevent="startDrawing"
        @touchmove.prevent="draw"
        @touchend.prevent="stopDrawing"
      ></canvas>
    </div>
    
    <!-- 工具栏 -->
    <div class="flex items-center gap-4 bg-gray-50 dark:bg-gray-800 p-2 rounded-lg border border-gray-200 dark:border-gray-700">
      <div class="flex-1 flex items-center gap-2">
        <span class="text-xs text-gray-500 whitespace-nowrap">画笔大小</span>
        <input type="range" v-model.number="brushSize" min="10" max="100" step="5" class="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer dark:bg-gray-700" />
        <span class="text-xs text-gray-500 w-8">{{ brushSize }}</span>
      </div>
      <button type="button" @click="clearCanvas" class="px-3 py-1.5 text-xs font-medium text-red-600 bg-red-50 border border-red-200 rounded hover:bg-red-100 dark:bg-red-900/20 dark:text-red-400 dark:border-red-800 dark:hover:bg-red-900/40 transition-colors">
        清除蒙版
      </button>
    </div>
    <p class="text-xs text-gray-400">提示: 涂抹你想要修改的区域（红色区域将被重绘）</p>
  </div>
</template>
