export interface PushRegistration {
  /** Expo push token (ExponentPushToken[...]). */
  token: string;
  platform: 'ios' | 'android';
}

/** Cổng push notification. Trả null khi không hỗ trợ (web, máy ảo, Expo Go, chưa cấu hình, người dùng từ chối). */
export interface PushGateway {
  register(): Promise<PushRegistration | null>;
  setBadgeCount(count: number): Promise<void>;
}

export class NoopPushGateway implements PushGateway {
  async register(): Promise<PushRegistration | null> {
    return null;
  }
  async setBadgeCount(): Promise<void> {}
}
