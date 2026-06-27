import { useState, useEffect, useCallback } from 'react';
import { api } from '@/lib/axios';
import { toast } from 'sonner';
import { AuditHistory, BlacklistItem, AlertConfigResponse } from '../_types';

export function useUserSettings(code: string | undefined, activeTab: 'alertConfig' | 'historyBlacklist') {
  // 报警配置表单状态
  const [configEmail, setConfigEmail] = useState('');
  const [configOffline, setConfigOffline] = useState(true);
  const [configOfflineTimeout, setConfigOfflineTimeout] = useState(10);
  const [configLauncher, setConfigLauncher] = useState(true);
  const [configLocked, setConfigLocked] = useState(false);
  const [configVpn, setConfigVpn] = useState(true);
  const [configErrorLog, setConfigErrorLog] = useState(true);
  const [configMemoryLimit, setConfigMemoryLimit] = useState(150);
  const [configSaving, setConfigSaving] = useState(false);

  // 防多开防共享配置状态
  const [configPreventDuplicate, setConfigPreventDuplicate] = useState(false);
  const [configDuplicateAction, setConfigDuplicateAction] = useState<'kick_new' | 'kick_old'>('kick_new');

  // PWA 桌面推送通知状态
  const [isPushSupported] = useState(() => 
    typeof window !== 'undefined' && 'serviceWorker' in navigator && 'PushManager' in window
  );
  const [isSubscribed, setIsSubscribed] = useState(false);
  const [showGuide, setShowGuide] = useState(false);
  const [isPushLoading, setIsPushLoading] = useState(false);

  // 历史记录与黑名单状态
  const [historyList, setHistoryList] = useState<AuditHistory[]>([]);
  const [blacklist, setBlacklist] = useState<BlacklistItem[]>([]);
  const [historyLoading, setHistoryLoading] = useState(false);
  const [refreshTrigger, setRefreshTrigger] = useState(0);

  const triggerRefresh = useCallback(() => {
    setRefreshTrigger(prev => prev + 1);
  }, []);

  // 转换 VAPID 公钥为 Uint8Array
  const urlBase64ToUint8Array = useCallback((base64String: string) => {
    const padding = '='.repeat((4 - base64String.length % 4) % 4);
    const base64 = (base64String + padding)
      .replace(/-/g, '+')
      .replace(/_/g, '/');

    const rawData = window.atob(base64);
    const outputArray = new Uint8Array(rawData.length);

    for (let i = 0; i < rawData.length; ++i) {
      outputArray[i] = rawData.charCodeAt(i);
    }
    return outputArray;
  }, []);

  // 辅助函数：Promise 超时包装，防止 Ready 等 API 永远 Pending 导致卡死
  const withTimeout = useCallback(<T>(promise: Promise<T>, ms: number, errorMsg: string): Promise<T> => {
    return new Promise<T>((resolve, reject) => {
      const timer = setTimeout(() => {
        reject(new Error(errorMsg));
      }, ms);
      promise
        .then((res) => {
          clearTimeout(timer);
          resolve(res);
        })
        .catch((err) => {
          clearTimeout(timer);
          reject(err);
        });
    });
  }, []);

  // 检测桌面推送订阅状态
  const checkPushSubscription = useCallback(async () => {
    if (typeof window !== 'undefined' && 'serviceWorker' in navigator && 'PushManager' in window) {
      try {
        const reg = await navigator.serviceWorker.ready;
        const sub = await reg.pushManager.getSubscription();
        setIsSubscribed(!!sub);
        
        if (Notification.permission === 'denied') {
          setShowGuide(true);
        }
      } catch (err) {
        console.error('检测推送订阅失败:', err);
      }
    }
  }, []);

  // 切换桌面推送
  const handleTogglePush = useCallback(async (checked: boolean) => {
    // 1. 检测是否为 iOS 且非主屏幕应用 (PWA Standalone) 模式，并予以友好拦截
    const isIOS = typeof navigator !== 'undefined' && /iPad|iPhone|iPod/.test(navigator.userAgent);
    const isStandalone = typeof window !== 'undefined' && (
      ('standalone' in window.navigator && (window.navigator as unknown as { standalone: boolean }).standalone) ||
      window.matchMedia('(display-mode: standalone)').matches
    );

    if (isIOS && !isStandalone) {
      toast.error(
        '🍎 iOS 系统限制：请先在 Safari 浏览器中点击下方“分享”按钮，选择“添加到主屏幕”，然后从桌面图标打开此应用再启用桌面推送通知。',
        { duration: 8000 }
      );
      return;
    }

    if (!isPushSupported) {
      toast.error('当前浏览器或系统不支持 PWA 桌面推送通知');
      return;
    }

    setIsPushLoading(true);
    if (checked) {
      const permission = await Notification.requestPermission();
      if (permission !== 'granted') {
        setIsSubscribed(false);
        setShowGuide(true);
        toast.error('您拒绝了通知权限，请按照下方指引重新允许');
        setIsPushLoading(false);
        return;
      }

      setShowGuide(false);
      try {
        // 声明具体的接口响应类型以消除 any
        const res = await api.get<{ publicKey: string }, { publicKey: string }>('/register-codes/vapid-public-key');
        const publicKey = res.publicKey;
        console.log('获取到的 VAPID 公钥:', publicKey);

        if (!publicKey) {
          throw new Error('获取 VAPID 公钥为空，请检查后端配置或接口返回格式');
        }
        
        // 6秒超时 ready 检查，防止在未就绪环境一直挂起
        const reg = await withTimeout(
          navigator.serviceWorker.ready,
          6000,
          'Service Worker 无法就绪，请尝试刷新页面。如果是在 iOS 上，请确保已添加至主屏幕并使用 HTTPS 访问。'
        );
        console.log('Service Worker 状态就绪:', reg);

        // 8秒超时订阅尝试，防止连接运营商推送服务无响应
        const subscription = await withTimeout(
          reg.pushManager.subscribe({
            userVisibleOnly: true,
            applicationServerKey: urlBase64ToUint8Array(publicKey)
          }),
          8000,
          '向推送服务发起订阅请求超时，请检查网络状况或通知权限设置。'
        );
        console.log('PushManager 订阅成功:', subscription);

        await api.post('/register-codes/subscribe-push', { code, subscription });
        setIsSubscribed(true);
        toast.success('🎉 成功为该设备订阅此浏览器的桌面通知气泡！');
      } catch (err: unknown) {
        const error = err as { name?: string; message?: string; stack?: string };
        console.error('订阅推送失败，详细错误:', {
          name: error.name,
          message: error.message,
          stack: error.stack,
          raw: err
        });
        toast.error(`启用桌面推送失败: ${error.message || error.name || '未知原因'}`);
      }
    } else {
      try {
        const reg = await withTimeout(
          navigator.serviceWorker.ready,
          6000,
          'Service Worker 准备超时'
        );
        const sub = await reg.pushManager.getSubscription();
        if (sub) {
          await sub.unsubscribe();
          await api.post('/register-codes/unsubscribe-push', { code, endpoint: sub.endpoint });
        }
        setIsSubscribed(false);
        toast.success('已停用此浏览器的桌面通知接收');
      } catch (err) {
        console.error('注销推送失败:', err);
        toast.error('停用桌面推送失败');
      }
    }
    setIsPushLoading(false);
  }, [code, isPushSupported, urlBase64ToUint8Array, withTimeout]);

  const handleSaveAlertConfig = useCallback(async () => {
    if (!code) return;
    setConfigSaving(true);
    try {
      const payload = {
        code,
        alertEmail: configEmail,
        alertConfig: {
          offline: configOffline,
          offlineTimeout: configOfflineTimeout,
          launcher: configLauncher,
          locked: configLocked,
          vpn: configVpn,
          errorLog: configErrorLog,
          memoryLimit: configMemoryLimit * 1024, // 存为 KB
          preventDuplicateAccount: configPreventDuplicate,
          duplicateAction: configDuplicateAction,
        }
      };
      await api.patch('/register-codes/my-alert', payload);
      toast.success('邮件报警推送配置保存成功！');
    } catch (err: unknown) {
      const error = err as Error;
      toast.error(error.message || '保存警报配置失败');
    } finally {
      setConfigSaving(false);
    }
  }, [code, configEmail, configOffline, configOfflineTimeout, configLauncher, configLocked, configVpn, configErrorLog, configMemoryLimit, configPreventDuplicate, configDuplicateAction]);

  const handleAddBlacklist = useCallback(async (deviceId: string, deviceName: string) => {
    if (!code) return;
    const reason = window.prompt(`请输入拉黑设备 [ ${deviceName} ] 的原因（选填）:`);
    if (reason === null) return;
    try {
      await api.post('/register-codes/my-devices/blacklist', { code, deviceId, deviceName, reason, operator: 'user' });
      toast.success(`设备 [ ${deviceName} ] 已成功加入黑名单，禁止再绑定此激活码`);
      triggerRefresh();
    } catch (err: unknown) {
      const error = err as Error;
      toast.error(error.message || '拉黑失败');
    }
  }, [code, triggerRefresh]);

  const handleRemoveBlacklist = useCallback(async (deviceId: string, deviceName: string) => {
    if (!code) return;
    const confirm = window.confirm(`确定要将设备 [ ${deviceName} ] 移出黑名单并重新允许其绑定吗？`);
    if (!confirm) return;
    try {
      await api.delete('/register-codes/my-devices/blacklist', {
        params: { code, deviceId, operator: 'user' }
      });
      toast.success(`设备 [ ${deviceName} ] 已移出黑名单`);
      triggerRefresh();
    } catch (err: unknown) {
      const error = err as Error;
      toast.error(error.message || '解封失败');
    }
  }, [code, triggerRefresh]);

  // 仅在 code 挂载或就绪时检测一次 PWA 推送订阅状态
  useEffect(() => {
    if (code) {
      Promise.resolve().then(() => {
        checkPushSubscription();
      });
    }
  }, [code, checkPushSubscription]);

  useEffect(() => {
    if (!code) return;
    let active = true;

    if (activeTab === 'alertConfig') {
      api.get<unknown, AlertConfigResponse>(`/register-codes/my-alert?code=${code}`)
        .then((data) => {
          if (!active) return;
          setConfigEmail(data.alertEmail || '');
          const cfg = data.alertConfig || {};
          setConfigOffline(cfg.offline !== false);
          setConfigOfflineTimeout(cfg.offlineTimeout ? Math.round(cfg.offlineTimeout) : 10);
          setConfigLauncher(cfg.launcher !== false);
          setConfigLocked(cfg.locked === true);
          setConfigVpn(cfg.vpn !== false);
          setConfigErrorLog(cfg.errorLog !== false);
          setConfigMemoryLimit(cfg.memoryLimit ? Math.round(cfg.memoryLimit / 1024) : 150);
          setConfigPreventDuplicate(cfg.preventDuplicateAccount === true);
          setConfigDuplicateAction(cfg.duplicateAction || 'kick_new');
        })
        .catch((err) => {
          console.error('获取配置失败:', err);
        });
    } else if (activeTab === 'historyBlacklist') {
      Promise.resolve().then(() => {
        if (active) {
          setHistoryLoading(true);
        }
      });
      Promise.all([
        api.get<unknown, AuditHistory[]>('/register-codes/my-devices/history', { params: { code } }),
        api.get<unknown, BlacklistItem[]>('/register-codes/my-devices/blacklist', { params: { code } }),
      ])
        .then(([hist, black]) => {
          if (!active) return;
          setHistoryList(
            (hist || []).map((h) => ({
              ...h,
              deviceName: h.deviceName || '未知设备',
              lastIp: h.lastIp || '127.0.0.1',
            }))
          );
          setBlacklist(
            (black || []).map((b) => ({
              ...b,
              deviceName: b.deviceName || '未知设备',
              reason: b.reason || '无',
            }))
          );
        })
        .catch(() => {
          toast.error('获取历史记录或黑名单失败');
        })
        .finally(() => {
          if (active) {
            setHistoryLoading(false);
          }
        });
    }

    return () => {
      active = false;
    };
  }, [activeTab, code, refreshTrigger]);

  return {
    configEmail, setConfigEmail,
    configOffline, setConfigOffline,
    configOfflineTimeout, setConfigOfflineTimeout,
    configLauncher, setConfigLauncher,
    configLocked, setConfigLocked,
    configVpn, setConfigVpn,
    configErrorLog, setConfigErrorLog,
    configMemoryLimit, setConfigMemoryLimit,
    configSaving,
    configPreventDuplicate, setConfigPreventDuplicate,
    configDuplicateAction, setConfigDuplicateAction,
    isPushSupported,
    isSubscribed,
    showGuide,
    isPushLoading,
    handleTogglePush,
    historyList,
    blacklist,
    historyLoading,
    handleSaveAlertConfig,
    handleAddBlacklist,
    handleRemoveBlacklist,
    triggerRefresh
  };
}
