import { create } from 'zustand';
import { persist, createJSONStorage, StateStorage } from 'zustand/middleware';
import { encryptData, decryptData } from '@/lib/crypto';

// 用户基础信息类型定义
export interface UserProfile {
  id: string;
  username: string;
  nickname?: string;
  email?: string;
  avatar?: string;
  role?: {
    id: string;
    name: string;
    code: string;
  };
  deviceId?: string;
  expireTime?: string;
}

// 物理设备状态定义
export interface DeviceItem {
  id: string;
  name: string;
  ip: string;
  status: 'online' | 'offline';
  battery?: number;
}

// UserStore 状态接口定义
interface UserState {
  user: UserProfile | null;
  permissions: string[]; // 用户按钮/菜单级权限列表，如 ['user:create', 'code:delete']
  isAuthenticated: boolean;
  
  // 管理端单独的 Token
  adminAccessToken: string | null;
  adminRefreshToken: string | null;
  
  // 授权激活码用户端单独的 Token
  clientAccessToken: string | null;
  clientRefreshToken: string | null;

  // 运行期 SSE 长连接通信指示状态
  sseConnected: boolean;
  // 动态更新的所有在线与历史绑定物理设备列表
  activeDevices: DeviceItem[];
  // 网页端高频日志订阅监听回调
  logListener: ((log: any) => void) | null;

  setAuth: (
    user: UserProfile,
    permissions: string[],
    accessToken?: string | null,
    refreshToken?: string | null
  ) => void;
  clearAuth: () => void;
  updateUser: (profile: Partial<UserProfile>) => void;

  // 全局 SSE 心跳连通指示
  setSseConnected: (connected: boolean) => void;
  // 覆写设备列表
  setDevicesList: (devices: DeviceItem[]) => void;
  // 增量/状态更新设备列表
  handleDeviceEvent: (type: 'device_list' | 'device_status', payload: any) => void;
  // 日志页面订阅全局日志流的钩子
  subscribeLogs: (listener: (log: any) => void) => () => void;
  // 分发广播实时日志
  emitLog: (log: any) => void;
}

const isProduction = process.env.NODE_ENV === 'production';

// 动态分区持久化前缀：针对管理员 (/admin) 与卡密普通用户 (/user) 分别读写不同的 LocalStorage 键名
const getRealName = (name: string): string => {
  if (typeof window !== 'undefined') {
    const isUser = window.location.pathname.startsWith('/user');
    return `${name}_${isUser ? 'client' : 'admin'}`;
  }
  return name;
};

// 自定义安全的加密/解密本地存储驱动引擎 (带篡改强行退登保护)
const secureStorage: StateStorage = {
  getItem: (name: string): string | null => {
    const realName = getRealName(name);
    const rawValue = localStorage.getItem(realName);
    if (!rawValue) return null;
    
    try {
      // 仅在生产环境下执行 AES 解密驱动
      const decrypted = isProduction ? decryptData(rawValue) : rawValue;
      return decrypted;
    } catch (error) {
      console.warn(`[Security] 本地持久化缓存 [${realName}] 数据异常或被手动修改。为了保障账户安全，已强制清空缓存并下线。`, error);
      localStorage.removeItem(realName);
      return null;
    }
  },
  setItem: (name: string, value: string): void => {
    const realName = getRealName(name);
    // 仅在生产环境下进行高强度 AES-256 加密
    const finalValue = isProduction ? encryptData(value) : value;
    localStorage.setItem(realName, finalValue);
  },
  removeItem: (name: string): void => {
    localStorage.removeItem(getRealName(name));
  }
};

export const useUserStore = create<UserState>()(
  persist(
    (set) => ({
      user: null,
      permissions: [],
      isAuthenticated: false,
      adminAccessToken: null,
      adminRefreshToken: null,
      clientAccessToken: null,
      clientRefreshToken: null,

      // 运行期临时状态初始化
      sseConnected: false,
      activeDevices: [],
      logListener: null,
      
      setAuth: (user, permissions, accessToken = null, refreshToken = null) => {
        // 判断当前登录的用户是否是终端授权用户 (client)
        const isClient = user.role?.code === 'client';
        
        set({
          user,
          permissions,
          isAuthenticated: true,
          adminAccessToken: isClient ? null : accessToken,
          adminRefreshToken: isClient ? null : refreshToken,
          clientAccessToken: isClient ? accessToken : null,
          clientRefreshToken: isClient ? refreshToken : null,
        });
      },
      
      clearAuth: () =>
        set({
          user: null,
          permissions: [],
          isAuthenticated: false,
          adminAccessToken: null,
          adminRefreshToken: null,
          clientAccessToken: null,
          clientRefreshToken: null,
          sseConnected: false,
          activeDevices: [],
          logListener: null,
        }),
        
      updateUser: (profile) =>
        set((state) => ({
          user: state.user ? { ...state.user, ...profile } : null,
        })),

      setSseConnected: (connected: boolean) => set({ sseConnected: connected }),

      setDevicesList: (devices: DeviceItem[]) => set({ activeDevices: devices }),

      handleDeviceEvent: (type: 'device_list' | 'device_status', payload: any) =>
        set((state) => {
          let updated = [...state.activeDevices];
          if (type === 'device_list') {
            const { action, deviceId, appName, deviceInfo, ip } = payload;
            if (action === 'online') {
              const idx = updated.findIndex((d) => d.id === deviceId);
              const resolvedName = (deviceInfo?.name && deviceInfo.name !== 'Unknown Name')
                ? deviceInfo.name
                : (appName || '未知设备');
              const newItem: DeviceItem = {
                id: deviceId,
                name: resolvedName,
                ip: ip || '',
                status: 'online',
                battery: deviceInfo?.battery || 100,
              };
              if (idx > -1) {
                updated[idx] = { ...updated[idx], ...newItem };
              } else {
                updated.push(newItem);
              }
            } else if (action === 'offline') {
              updated = updated.map((d) =>
                d.id === deviceId ? { ...d, status: 'offline' as const } : d
              );
            }
          } else if (type === 'device_status') {
            const { battery, status, ip, deviceId } = payload;
            updated = updated.map((d) =>
              d.id === deviceId
                ? {
                    ...d,
                    battery: battery !== undefined ? battery : d.battery,
                    status: status || d.status,
                    ip: ip || d.ip,
                  }
                : d
            );
          }
          return { activeDevices: updated };
        }),

      subscribeLogs: (listener: (log: any) => void) => {
        set({ logListener: listener });
        return () => {
          set((state) => (state.logListener === listener ? { logListener: null } : {}));
        };
      },

      emitLog: (log: any) => {
        const listener = useUserStore.getState().logListener;
        if (listener) {
          listener(log);
        }
      },
    }),
    {
      name: 'user-storage', // 存储在 localStorage 中的键名
      storage: createJSONStorage(() => secureStorage), // 使用安全的对称加密引擎
      partialize: (state) => ({
        user: state.user,
        permissions: state.permissions,
        isAuthenticated: state.isAuthenticated,
        adminAccessToken: state.adminAccessToken,
        adminRefreshToken: state.adminRefreshToken,
        clientAccessToken: state.clientAccessToken,
        clientRefreshToken: state.clientRefreshToken,
      }), // 过滤排除运行时临时状态，防止本地持久化加密异常
    }
  )
);
