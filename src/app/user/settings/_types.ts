export interface AuditHistory {
  id: string;
  deviceId: string;
  deviceName: string;
  lastIp: string;
  boundAt: string;
  unbindAt: string;
  unbindReason: string;
}

export interface BlacklistItem {
  id: string;
  deviceId: string;
  deviceName: string;
  blockedAt: string;
  reason: string;
}

export interface AlertConfig {
  offline?: boolean;
  offlineTimeout?: number;
  launcher?: boolean;
  locked?: boolean;
  vpn?: boolean;
  errorLog?: boolean;
  memoryLimit?: number;
  preventDuplicateAccount?: boolean;
  duplicateAction?: 'kick_new' | 'kick_old';
}

export interface AlertConfigResponse {
  alertEmail: string | null;
  alertConfig: AlertConfig | null;
}
