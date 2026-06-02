import { io, Socket } from 'socket.io-client';

let socket: Socket | null = null;

/**
 * 获取全局唯一的 Socket.IO 客户端长连接单例实例。
 * 延迟加载，防止在服务器端渲染 (SSR) 时尝试建立 TCP 通信导致报错。
 */
export const getSocket = (): Socket => {
  if (typeof window === 'undefined') {
    // 服务器端组件 (SSR) 不应建立 WS 连接，直接返回一个 mock 代理或 throw
    return {} as Socket;
  }

  if (!socket) {
    const wsUrl = process.env.NEXT_PUBLIC_WS_URL || 'http://localhost:8081';
    
    socket = io(wsUrl, {
      autoConnect: false, // 不默认自动连接，由鉴权成功后的页面控制连接，防止无效握手
      transports: ['websocket'], // 强力锁定使用高性能的 websocket 通信协议，避免 http 长轮询握手带来的性能损耗
      reconnection: true, // 启用自动重连机制
      reconnectionAttempts: 10, // 最大重连尝试次数
      reconnectionDelay: 2000, // 重连延迟间隔 (毫秒)
      timeout: 20000, // 连接物理超时时间 20 秒
    });

    // 绑定基础系统级长连接事件日志 (用于开发调试诊断)
    socket.on('connect', () => {
      console.log('[Socket.IO] 🤝 WebSockets 物理信道连接成功，通信 ID:', socket?.id);
    });

    socket.on('disconnect', (reason) => {
      console.warn('[Socket.IO] ⚠️ WebSockets 长连接断开连接，原因:', reason);
    });

    socket.on('connect_error', (error) => {
      console.error('[Socket.IO] ❌ 物理信道握手建立失败:', error.message);
    });
  }

  return socket;
};

/**
 * 彻底释放 Socket 连接并清理单例 (用于退出登录或彻底离线时)
 */
export const disconnectSocket = () => {
  if (socket) {
    socket.disconnect();
    socket = null;
    console.log('[Socket.IO] 🔌 长连接已主动断开并清理单例。');
  }
};
