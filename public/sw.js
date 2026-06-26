const CACHE_NAME = 'xbnest-cache-v1';
const OFFLINE_URL = '/offline';

// PWA 预缓存应用骨架 (App Shell) 静态资源
const ASSETS_TO_CACHE = [
  OFFLINE_URL,
  '/icons/icon-192x192.png',
  '/icons/icon-512x512.png',
  '/icons/apple-touch-icon.png',
];

// 1. 安装阶段：预缓存核心静态文件
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      console.log('[Service Worker] Pre-caching offline pages');
      return cache.addAll(ASSETS_TO_CACHE);
    })
  );
  self.skipWaiting(); // 强制激活新的 Service Worker
});

// 2. 激活阶段：清理过期的老旧缓存
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames.map((cache) => {
          if (cache !== CACHE_NAME) {
            console.log('[Service Worker] Cleaning old cache:', cache);
            return caches.delete(cache);
          }
        })
      );
    })
  );
  self.clients.claim();
});

// 3. 拦截抓取：定义智能缓存策略 (Network-First 与 Cache-First 混合)
self.addEventListener('fetch', (event) => {
  // 仅拦截同源 GET 请求，不拦截 API 接口和 WebSocket
  if (event.request.method !== 'GET' || !event.request.url.startsWith(self.location.origin)) {
    return;
  }

  const url = new URL(event.request.url);

  // 如果是 API 请求、后台数据接口或第三方静态，始终直接走网络，不走 SW 离线缓存
  if (url.pathname.startsWith('/api') || url.pathname.includes('socket.io') || url.pathname.includes('/_next/webpack-hmr')) {
    return;
  }

  event.respondWith(
    // 对常规页面 HTML：采取“网络优先，缓存备份”策略 (Network First)
    // 能够保证获取最新挂机数据的同时，在断网时读取缓存或展示离线友好页
    fetch(event.request)
      .then((response) => {
        // 如果请求成功，克隆一份响应并塞入缓存
        if (response.status === 200) {
          const responseToCache = response.clone();
          caches.open(CACHE_NAME).then((cache) => {
            cache.put(event.request, responseToCache);
          });
        }
        return response;
      })
      .catch(() => {
        // 网络访问失败 (例如彻底断网)，尝试从本地 Cache 匹配
        return caches.match(event.request).then((cachedResponse) => {
          if (cachedResponse) {
            return cachedResponse;
          }
          // 如果是页面 HTML 且没有任何缓存，则重定向展示自定义的离线友好提示页
          if (event.request.headers.get('accept')?.includes('text/html')) {
            return caches.match(OFFLINE_URL);
          }
        });
      })
  );
});
