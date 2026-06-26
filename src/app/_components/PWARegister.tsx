'use client';

import { useEffect } from 'react';

export default function PWARegister() {
  useEffect(() => {
    if (typeof window !== 'undefined' && 'serviceWorker' in navigator) {
      window.addEventListener('load', () => {
        navigator.serviceWorker
          .register('/sw.js')
          .then((registration) => {
            console.log('小宝修仙 PWA Service Worker 注册成功，Scope:', registration.scope);
          })
          .catch((error) => {
            console.error('小宝修仙 PWA Service Worker 注册失败:', error);
          });
      });
    }
  }, []);

  return null;
}
