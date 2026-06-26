import { MetadataRoute } from 'next';

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: '小宝修仙控制台',
    short_name: '小宝控制',
    description: '物理挂机设备大屏与卡密授权配置终端',
    start_url: '/user/login', // 桌面快捷方式点开后的直达页面
    display: 'standalone', // 像原生独立应用窗口一样运行 (隐藏地址栏)
    orientation: 'any', // 支持屏幕旋转
    background_color: '#09090b', // 启动时的背景色 (对齐暗黑模式底色 zinc-950)
    theme_color: '#6366f1', // 系统状态栏与顶部主题色 (对齐 indigo-500)
    icons: [
      {
        src: '/icons/icon-192x192.png',
        sizes: '192x192',
        type: 'image/png',
        purpose: 'any',
      },
      {
        src: '/icons/icon-512x512.png',
        sizes: '512x512',
        type: 'image/png',
        purpose: 'maskable', // 适配操作系统异形裁剪图标
      },
    ],
  };
}
