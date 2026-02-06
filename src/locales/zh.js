export default {
  app: {
    title: 'Tuzi 智绘工坊',
    description: '封装 Tuzi API 异步接口，提供<span class="font-semibold text-indigo-600 dark:text-indigo-400">"二段跳"</span>式的高效生图与视频创作体验',
    theme: {
      light: '浅色模式',
      auto: '跟随系统',
      dark: '深色模式'
    }
  },
  config: {
    title: '全局配置',
    baseUrl: 'API Base URL',
    token: 'Token',
    persistToken: '记住 Token (本地持久化)',
    showToken: '显示/隐藏 Token',
    autoFilled: '已自动填充 URL Token',
    register: '注册获取 Token (邀请码: SJ33)',
    docs: '查看 API 接口文档'
  },
  tabs: {
    image: '图像生成',
    video: '视频生成'
  },
  status: {
    title: '任务状态',
    taskIdPlaceholder: '任务 ID',
    query: '查询任务',
    poll: '轮询',
    stop: '停止',
    completed: '已完成',
    failed: '执行失败',
    queued: '排队中',
    processing: '处理中',
    unknown: '未知状态'
  },
  logs: {
    passkeySuccess: 'Passkey 登录成功，Token 已自动填充 (用户: {username})',
    switchMode: '切换到{mode}模式',
    imageMode: '图片生成',
    videoMode: '视频生成',
    startTask: '开始创建任务 [{model}]...',
    addRefImage: '添加参考图片: {name}',
    addRefUrl: '添加参考 URL: {url}',
    addMask: '添加蒙版图片: {name}',
    submitting: '正在向服务器提交请求...',
    submitSuccess: '任务提交成功! ID: {id}',
    waitAlert: '需要注意，任务可能需要几分钟才能完成，尤其是高分辨率',
    startPolling: '准备开始轮询任务状态...',
    statusUpdate: '状态更新: {icon} {label} ({status})',
    taskCompleted: '任务已完成! {icon}',
    taskFailed: '任务执行失败. {icon}',
    pollError: '轮询请求出错: {message}',
    manualQuery: '手动查询任务: {id}',
    querySuccess: '查询成功: {icon} {label} ({status})',
    queryFail: '查询失败: {message}',
    submitFail: '任务提交失败: {message}'
  },
  footer: {
    github: 'GitHub 源码',
    mirror: 'CNB 镜像',
    designedBy: 'Designed by',
    poweredBy: 'Powered by'
  },
  result: {
    status: 'Status',
    progress: 'Progress',
    created: 'Created'
  },
  imageForm: {
    mode: {
      generate: '图片生成',
      inpainting: '局部覆写'
    },
    model: '模型',
    actualValue: '实际值: {value}',
    apiVersion: {
      label: '接口版本',
      tuzi: '兔子接口',
      official: '官方接口',
      officialDesc: '官方接口: 底图在 input_reference，蒙版在 mask',
      tuziDesc: '兔子接口: 底图和蒙版都在 input_reference'
    },
    size: {
      label: '尺寸',
      default: '默认 (不传参数)'
    },
    prompt: {
      label: '提示词',
      inpaintingPrefix: '局部覆写模式会自动在提示词前添加: ',
      inpaintingPrefixContent: '"inpainting, "',
      inpaintingPlaceholder: '描述你想要在蒙版区域生成的内容...',
      generatePlaceholder: '描述你想要生成的图片...'
    },
    inpainting: {
      label: '上传底图',
      uploadText: '点击或拖拽上传底图',
      changeImage: '更换底图'
    },
    reference: {
      label: '参考图 (可选)',
      uploadText: '点击或拖拽上传参考图 (支持多张)',
      urlPlaceholder: '或输入图片 URL (多个用换行/逗号分隔)',
      selected: '已选择 {count} 张图片',
      change: '点击更换'
    },
    submit: {
      submitting: '提交中...',
      start: '开始生成'
    },
    logs: {
      selectedFiles: '已选择 {count} 张参考图',
      selectedBaseImage: '已选择底图: {name}',
      removedFile: '已移除文件: {name}',
      pastedBaseImage: '已粘贴底图: {name}',
      pastedFile: '已粘贴文件: {name}'
    }
  },
  videoForm: {
    model: '模型',
    actualValue: '实际值: {value}',
    seconds: {
      label: '时长',
      default: '默认 (不传参数)',
      s8: '8 秒'
    },
    size: {
      label: '尺寸',
      default: '默认 (不传参数)',
      landscape: '1280x720 (横屏)',
      portrait: '720x1280 (竖屏)'
    },
    watermark: '添加水印',
    prompt: {
      label: '提示词',
      placeholder: '描述你想要生成的视频...'
    },
    reference: {
      label: '参考图 (可选)',
      hint: '上传参考图可以让视频生成更符合预期 (支持多张)',
      uploadText: '点击或拖拽上传参考图',
      selected: '已选择 {count} 张图片',
      change: '点击更换'
    },
    submit: {
      submitting: '提交中...',
      start: '开始生成'
    },
    logs: {
      selectedFiles: '已选择 {count} 张参考图',
      removedFile: '已移除文件: {name}',
      pastedFile: '已粘贴文件: {name}'
    }
  },
  logConsole: {
    waiting: '等待任务提交...',
    support: '⚡ 支持一下 (爱发电)'
  },
  maskEditor: {
    brushSize: '笔刷大小',
    clear: '清除',
    hint: '在图片上涂抹需要重绘的区域'
  },
  usageGuide: {
    title: '系统使用流程',
    step1: {
      title: '1. 准备工作',
      desc: '配置鉴权 或 Passkey'
    },
    step2: {
      title: '2. 选择模式',
      desc: '切换图片或视频生成'
    },
    step3: {
      title: '3. 提交任务',
      desc: '设置参数并开始生成'
    },
    step4: {
      title: '4. 获取结果',
      desc: '自动轮询 或 手动查询'
    },
    shortcut: '已有任务 ID 可直接查询',
    tip: {
      title: '提示',
      content: '如果是首次使用，请先在左侧"全局配置"中填入有效的 Token。已有「任务 ID 」可直接在右上角输入查询。'
    }
  },
  resultDisplay: {
    processing: '处理中...',
    placeholder: '生成结果将在此显示',
    modeImage: '模式: 图像生成',
    modeVideo: '模式: 视频生成'
  },
  siteStats: {
    last30DaysVisits: '最近30天访客',
    last30DaysImages: '最近30天生成',
    totalImages: '累计生成'
  }
}
