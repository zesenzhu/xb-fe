import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';

interface GlobalState {
  sidebarCollapsed: boolean;
  theme: 'light' | 'dark';
  toggleSidebar: () => void;
  setSidebarCollapsed: (collapsed: boolean) => void;
  setTheme: (theme: 'light' | 'dark') => void;
  toggleTheme: () => void;
}

export const useGlobalStore = create<GlobalState>()(
  persist(
    (set) => ({
      sidebarCollapsed: false,
      theme: 'light',
      toggleSidebar: () =>
        set((state) => ({
          sidebarCollapsed: !state.sidebarCollapsed,
        })),
      setSidebarCollapsed: (collapsed) =>
        set({
          sidebarCollapsed: collapsed,
        }),
      setTheme: (theme) => {
        // 在浏览器中动态切换暗黑模式类名
        if (typeof window !== 'undefined') {
          const root = window.document.documentElement;
          if (theme === 'dark') {
            root.classList.add('dark');
          } else {
            root.classList.remove('dark');
          }
        }
        set({ theme });
      },
      toggleTheme: () =>
        set((state) => {
          const nextTheme = state.theme === 'light' ? 'dark' : 'light';
          if (typeof window !== 'undefined') {
            const root = window.document.documentElement;
            if (nextTheme === 'dark') {
              root.classList.add('dark');
            } else {
              root.classList.remove('dark');
            }
          }
          return { theme: nextTheme };
        }),
    }),
    {
      name: 'global-storage',
      storage: createJSONStorage(() => localStorage),
    }
  )
);
