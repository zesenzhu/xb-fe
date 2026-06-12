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

  setAuth: (
    user: UserProfile,
    permissions: string[],
    accessToken?: string | null,
    refreshToken?: string | null
  ) => void;
  clearAuth: () => void;
  updateUser: (profile: Partial<UserProfile>) => void;
}

const isProduction = process.env.NODE_ENV === 'production';

// 自定义安全的加密/解密本地存储驱动引擎 (带篡改强行退登保护)
const secureStorage: StateStorage = {
  getItem: (name: string): string | null => {
    const rawValue = localStorage.getItem(name);
    if (!rawValue) return null;
    
    try {
      // 仅在生产环境下执行 AES 解密驱动
      const decrypted = isProduction ? decryptData(rawValue) : rawValue;
      return decrypted;
    } catch (error) {
      console.warn(`[Security] 本地持久化缓存 [${name}] 数据异常或被手动修改。为了保障账户安全，已强制清空缓存并下线。`, error);
      localStorage.removeItem(name);
      return null;
    }
  },
  setItem: (name: string, value: string): void => {
    // 仅在生产环境下进行高强度 AES-256 加密
    const finalValue = isProduction ? encryptData(value) : value;
    localStorage.setItem(name, finalValue);
  },
  removeItem: (name: string): void => {
    localStorage.removeItem(name);
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
        }),
        
      updateUser: (profile) =>
        set((state) => ({
          user: state.user ? { ...state.user, ...profile } : null,
        })),
    }),
    {
      name: 'user-storage', // 存储在 localStorage 中的键名
      storage: createJSONStorage(() => secureStorage), // 使用安全的对称加密引擎
    }
  )
);
