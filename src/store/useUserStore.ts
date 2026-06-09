import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';

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
  setAuth: (user: UserProfile, permissions: string[]) => void;
  clearAuth: () => void;
}

export const useUserStore = create<UserState>()(
  persist(
    (set) => ({
      user: null,
      permissions: [],
      isAuthenticated: false,
      setAuth: (user, permissions) =>
        set({
          user,
          permissions,
          isAuthenticated: true,
        }),
      clearAuth: () =>
        set({
          user: null,
          permissions: [],
          isAuthenticated: false,
        }),
    }),
    {
      name: 'user-storage', // 存储在 localStorage 中的键名
      storage: createJSONStorage(() => localStorage), // 仅在浏览器端持久化
    }
  )
);
