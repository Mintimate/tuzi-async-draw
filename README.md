# Tuzi API Async Studio (Vite + Vue 3)

这是一个基于 Vite + Vue 3 的单页应用，用于调用 Tuzi API 进行异步图片/视频生成。

## 在 EdgeOne Pages 上部署 (一键部署)

这是一个兼容 EdgeOne Pages 的静态前端项目（Vite 构建，输出到 `dist`）。你可以通过 EdgeOne Pages 一键部署或手动配置构建：

一键部署：

[![使用 EdgeOne Pages 部署](https://cdnstatic.tencentcs.com/edgeone/pages/deploy.svg)](https://console.cloud.tencent.com/edgeone/pages/new?repository-url=https://github.com/Mintimate/tuzi-async-draw)

手动部署配置：

- 框架预设：Node.js（或留空，EdgeOne 会识别 `edgeone.json`）
- 构建命令：`npm run build`
- 输出目录：`dist`
- Node 版本：`22`

更多 EdgeOne Pages文档：https://pages.edgeone.ai/zh/document/product-introduction


## 功能

1.  **创建任务**: 配置 API Token、选择模型、输入提示词。支持**多张参考图片**上传或直接粘贴**图片 URL**（支持多个）。
2.  **灵活参数**: 预设多种生成尺寸（1:1, 16:9 等）与视频时长，支持自定义或留空。
3.  **查询结果**: 使用任务 ID 查询生成状态，支持自动轮询，并在生成完成后查看结果图片或视频。
4.  **自动刷新**: 后台自动轮询任务状态（5 秒间隔），支持手动启停。
5.  **UI 优化**: 统一的表单交互设计，优化了下拉框与输入框的视觉协同，支持响应式布局。

## 开发与运行

本项目已迁移至 Vite 构建工具。

### 1. 安装依赖

```bash
npm install
```

### 2. 启动开发服务器

```bash
npm run dev
```

访问终端显示的地址 (通常是 `http://localhost:5173`)。

### 3. 构建生产版本

```bash
npm run build
```

## 全局配置

*   **API Base URL**: 默认为 `https://api.tu-zi.com`。
*   **Token**: 你的 API 密钥。
*   配置会自动保存在本地浏览器缓存中。

## 文件结构

*   `index.html`: 入口文件
*   `src/main.js`: Vue 入口 JS
*   `src/App.vue`: 主应用组件 (包含所有逻辑)
*   `src/style.css`: Tailwind 引入与全局样式
*   `vite.config.js`: Vite 配置
*   `tailwind.config.js`: Tailwind 配置

## 注意事项

*   代码中假设 API 支持跨域请求 (CORS)。
*   查询结果返回字段名为 `video_url`，但实际内容为图片，工具已做适配显示。

