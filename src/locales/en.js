export default {
  app: {
    title: 'Tuzi Async Studio',
    description: 'Encapsulating Tuzi API async interface, providing <span class="font-semibold text-indigo-600 dark:text-indigo-400">"Double Jump"</span> efficient image and video creation experience',
    theme: {
      light: 'Light Mode',
      auto: 'System',
      dark: 'Dark Mode'
    }
  },
  config: {
    title: 'Global Config',
    baseUrl: 'API Base URL',
    token: 'Token',
    persistToken: 'Remember Token',
    showToken: 'Show/Hide Token',
    autoFilled: 'URL Token Auto-filled',
    register: 'Get Token (Invite Code: SJ33)',
    docs: 'API Documentation'
  },
  tabs: {
    image: 'Image Gen',
    video: 'Video Gen'
  },
  status: {
    title: 'Task Status',
    taskIdPlaceholder: 'Task ID',
    query: 'Query',
    poll: 'Poll',
    stop: 'Stop',
    completed: 'Completed',
    failed: 'Failed',
    queued: 'Queued',
    processing: 'Processing',
    unknown: 'Unknown'
  },
  logs: {
    passkeySuccess: 'Passkey Login Success, Token Auto-filled (User: {username})',
    switchMode: 'Switched to {mode} mode',
    imageMode: 'Image Generation',
    videoMode: 'Video Generation',
    startTask: 'Creating task [{model}]...',
    addRefImage: 'Added reference image: {name}',
    addRefUrl: 'Added reference URL: {url}',
    addMask: 'Added mask image: {name}',
    submitting: 'Submitting request to server...',
    submitSuccess: 'Task submitted successfully! ID: {id}',
    waitAlert: 'Note: Task may take a few minutes, especially for high resolution',
    startPolling: 'Starting to poll task status...',
    statusUpdate: 'Status Update: {icon} {label} ({status})',
    taskCompleted: 'Task Completed! {icon}',
    taskFailed: 'Task Failed. {icon}',
    pollError: 'Polling Error: {message}',
    manualQuery: 'Manual Query Task: {id}',
    querySuccess: 'Query Success: {icon} {label} ({status})',
    queryFail: 'Query Failed: {message}',
    submitFail: 'Task Submit Failed: {message}'
  },
  footer: {
    github: 'GitHub Source',
    mirror: 'CNB Mirror',
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
      generate: 'Generate',
      inpainting: 'Inpainting'
    },
    model: 'Model',
    actualValue: 'Actual Value: {value}',
    apiVersion: {
      label: 'API Version',
      tuzi: 'Tuzi API',
      official: 'Official API',
      officialDesc: 'Official API: Base image in input_reference, mask in mask',
      tuziDesc: 'Tuzi API: Both base image and mask in input_reference'
    },
    size: {
      label: 'Size',
      default: 'Default (no parameter)'
    },
    prompt: {
      label: 'Prompt',
      inpaintingPrefix: 'Inpainting mode will automatically add prefix: ',
      inpaintingPrefixContent: '"inpainting, "',
      inpaintingPlaceholder: 'Describe what you want to generate in the masked area...',
      generatePlaceholder: 'Describe the image you want to generate...'
    },
    inpainting: {
      label: 'Upload Base Image',
      uploadText: 'Click or drag to upload base image',
      changeImage: 'Change Image'
    },
    reference: {
      label: 'Reference Image (Optional)',
      uploadText: 'Click or drag to upload reference images (multiple supported)',
      urlPlaceholder: 'Or enter image URL (separate multiple with newline/comma)',
      selected: '{count} image(s) selected',
      change: 'Click to change'
    },
    submit: {
      submitting: 'Submitting...',
      start: 'Start Generation'
    },
    logs: {
      selectedFiles: 'Selected {count} reference image(s)',
      selectedBaseImage: 'Selected base image: {name}',
      removedFile: 'Removed file: {name}',
      pastedBaseImage: 'Pasted base image: {name}',
      pastedFile: 'Pasted file: {name}'
    }
  },
  videoForm: {
    model: 'Model',
    actualValue: 'Actual Value: {value}',
    seconds: {
      label: 'Duration',
      default: 'Default (no parameter)',
      s8: '8 seconds'
    },
    size: {
      label: 'Size',
      default: 'Default (no parameter)',
      landscape: '1280x720 (Landscape)',
      portrait: '720x1280 (Portrait)'
    },
    watermark: 'Add Watermark',
    prompt: {
      label: 'Prompt',
      placeholder: 'Describe the video you want to generate...'
    },
    reference: {
      label: 'Reference Image (Optional)',
      hint: 'Upload reference images to make video generation more accurate (multiple supported)',
      uploadText: 'Click or drag to upload reference images',
      selected: '{count} image(s) selected',
      change: 'Click to change'
    },
    submit: {
      submitting: 'Submitting...',
      start: 'Start Generation'
    },
    logs: {
      selectedFiles: 'Selected {count} reference image(s)',
      removedFile: 'Removed file: {name}',
      pastedFile: 'Pasted file: {name}'
    }
  },
  logConsole: {
    waiting: 'Waiting for task submission...',
    support: '⚡ Support (Afdian)'
  },
  maskEditor: {
    brushSize: 'Brush Size',
    clear: 'Clear',
    hint: 'Paint the area you want to redraw on the image'
  },
  usageGuide: {
    title: 'System Usage Flow',
    step1: {
      title: '1. Preparation',
      desc: 'Configure Auth or Passkey'
    },
    step2: {
      title: '2. Select Mode',
      desc: 'Switch between image or video generation'
    },
    step3: {
      title: '3. Submit Task',
      desc: 'Set parameters and start generation'
    },
    step4: {
      title: '4. Get Result',
      desc: 'Auto polling or manual query'
    },
    shortcut: 'Direct query with existing Task ID',
    tip: {
      title: 'Tip',
      content: 'If this is your first time, please fill in a valid Token in the "Global Config" on the left. If you have a Task ID, you can directly enter it in the upper right corner to query.'
    }
  },
  resultDisplay: {
    processing: 'Processing...',
    placeholder: 'Generation result will be displayed here',
    modeImage: 'Mode: Image Generation',
    modeVideo: 'Mode: Video Generation'
  },
  siteStats: {
    last30DaysVisits: 'Last 30 Days Visits',
    last30DaysImages: 'Last 30 Days Generated',
    totalImages: 'Total Generated'
  }
}
