export interface LicenseCode {
  id: string;
  code: string;
  source: 'CREATE' | 'IMPORT';
  appName: string | null;
  cardType: string;
  durationMinutes: number;
  maxActivations: number;
  currentActivations: number;
  rateLimit: number;
  deviceId: string | null;
  deviceIds?: string[];
  status: 'unused' | 'active' | 'expired' | 'full' | 'disabled';
  activatedAt: string | null;
  expiresAt: string | null;
  createdAt: string;
  remark: string | null;
}
