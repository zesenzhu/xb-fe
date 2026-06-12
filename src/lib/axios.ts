import axios, { AxiosError, AxiosInstance, InternalAxiosRequestConfig } from 'axios';
import { useUserStore } from '@/store/useUserStore';

// 定义接口错误响应结构
export interface ApiErrorResponse {
  message?: string | string[];
  error?: string;
  statusCode?: number;
}

// 处于刷新 Token 状态的标记
let isRefreshing = false;
// 存储因 401 而被挂起的请求队列
let failedQueue: Array<{
  resolve: (token: string) => void;
  reject: (err: unknown) => void;
}> = [];

// 处理挂起的请求队列
const processQueue = (error: unknown, token: string | null = null) => {
  failedQueue.forEach((prom) => {
    if (token) {
      prom.resolve(token);
    } else {
      prom.reject(error);
    }
  });
  failedQueue = [];
};

// 创建统一的 Axios 实例
export const api: AxiosInstance = axios.create({
  baseURL: process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8081/api',
  withCredentials: true, // 关键：允许携带 HttpOnly Cookie (AccessToken / RefreshToken)
  timeout: 15000, // 15秒超时时间
  headers: {
    'Content-Type': 'application/json',
  },
});

// 请求拦截器
api.interceptors.request.use(
  (config: InternalAxiosRequestConfig) => {
    // 动态提取当前作用域的 Token 并附加到 Headers 头部 (防跨端口/SameSite Cookie 丢失)
    if (typeof window !== 'undefined') {
      const isUserPath = window.location.pathname.startsWith('/user');
      const state = useUserStore.getState();
      const token = isUserPath ? state.clientAccessToken : state.adminAccessToken;
      if (token) {
        config.headers.Authorization = `Bearer ${token}`;
      }
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// 响应拦截器
api.interceptors.response.use(
  (response) => {
    // 统一只返回 data 数据层，简化前端页面使用
    return response.data;
  },
  async (error: AxiosError<ApiErrorResponse>) => {
    const originalRequest = error.config as InternalAxiosRequestConfig & { _retry?: boolean };

    // 排除登录/登出等基础认证请求，让这些请求的 401 报错直接抛回给表单页面处理
    const isAuthRequest = originalRequest.url?.includes('/auth/admin/login') || 
                          originalRequest.url?.includes('/auth/user/license-login') ||
                          originalRequest.url?.includes('/auth/admin/logout') ||
                          originalRequest.url?.includes('/auth/user/logout');

    // 如果响应状态码是 401 且该请求还没有重试过，且不是认证相关的请求
    if (error.response?.status === 401 && !originalRequest._retry && !isAuthRequest) {
      // 如果已经在刷新 Token 了，把当前请求放入队列挂起
      if (isRefreshing) {
        return new Promise((resolve, reject) => {
          failedQueue.push({
            resolve: () => {
              resolve(api(originalRequest));
            },
            reject: (err) => {
              reject(err);
            },
          });
        });
      }

      originalRequest._retry = true;
      isRefreshing = true;

      const isUserPath = typeof window !== 'undefined' && window.location.pathname.startsWith('/user');
      const state = useUserStore.getState();
      const refreshToken = isUserPath ? state.clientRefreshToken : state.adminRefreshToken;

      try {
        if (!refreshToken) {
          throw new Error('未检测到本地刷新凭证 (Refresh Token)，请重新登录');
        }

        const refreshPath = isUserPath ? '/auth/user/refresh' : '/auth/admin/refresh';

        // 使用独立的全新 Axios 实例，并使用 Body 将 refreshToken 传给后端
        const refreshRes = await axios.post<{ accessToken: string; refreshToken: string }>(
          `${api.defaults.baseURL}${refreshPath}`,
          { refreshToken },
          { withCredentials: true }
        );

        const { accessToken: newAccessToken, refreshToken: newRefreshToken } = refreshRes.data || {};

        if (!newAccessToken || !newRefreshToken) {
          throw new Error('签发的新 Token 无效，自动阻断重新登录');
        }

        // 更新 Zustand 状态中的 Token
        if (isUserPath) {
          useUserStore.setState({
            clientAccessToken: newAccessToken,
            clientRefreshToken: newRefreshToken,
          });
        } else {
          useUserStore.setState({
            adminAccessToken: newAccessToken,
            adminRefreshToken: newRefreshToken,
          });
        }

        // 刷新成功，清空挂起队列并重新发起所有请求
        processQueue(null, 'refreshed');
        return api(originalRequest);
      } catch (refreshError) {
        // 刷新 Token 失败（比如 RefreshToken 也过期了，或者账号被禁用）
        processQueue(refreshError, null);

        // 清除 Zustand 中的缓存状态并引导重新登录
        if (typeof window !== 'undefined') {
          const loginPath = isUserPath ? '/user/login' : '/admin/login';
          localStorage.removeItem('user-storage');
          window.location.href = `${loginPath}?expired=true&redirect=${encodeURIComponent(window.location.pathname)}`;
        }
        return Promise.reject(refreshError);
      } finally {
        isRefreshing = false;
      }
    }

    // 格式化错误结构，方便前端组件展示错误文本
    const errorData = error.response?.data;
    const errorMessage = Array.isArray(errorData?.message)
      ? errorData.message[0]
      : errorData?.message || error.message || '系统繁忙，请稍后再试';

    const customError = {
      message: errorMessage,
      statusCode: error.response?.status || 500,
      error: errorData?.error || 'UnknownError',
      rawError: error,
    };

    return Promise.reject(customError);
  }
);
