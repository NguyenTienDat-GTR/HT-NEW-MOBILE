import Constants from 'expo-constants';
import * as Device from 'expo-device';
import * as Notifications from 'expo-notifications';
import { Platform } from 'react-native';

import type { PushGateway, PushRegistration } from './push-gateway';

const ANDROID_CHANNEL_ID = 'default';

/** Adapter expo-notifications. Mọi lỗi (từ chối quyền, Expo Go, chưa có projectId) đều trả null, không ném. */
export class ExpoPushGateway implements PushGateway {
  async register(): Promise<PushRegistration | null> {
    try {
      if (!Device.isDevice) return null;
      if (Platform.OS !== 'ios' && Platform.OS !== 'android') return null;

      if (Platform.OS === 'android') {
        await Notifications.setNotificationChannelAsync(ANDROID_CHANNEL_ID, {
          name: 'Thông báo',
          // AndroidImportance được re-export qua `export *`; import/namespace không phân giải được.
          // eslint-disable-next-line import/namespace
          importance: Notifications.AndroidImportance.HIGH,
        });
      }

      const existing = await Notifications.getPermissionsAsync();
      const status =
        existing.status === 'granted'
          ? existing.status
          : (await Notifications.requestPermissionsAsync()).status;
      if (status !== 'granted') return null;

      const projectId =
        Constants.expoConfig?.extra?.eas?.projectId ?? Constants.easConfig?.projectId;
      if (!projectId) return null;

      const { data } = await Notifications.getExpoPushTokenAsync({ projectId });
      return { token: data, platform: Platform.OS };
    } catch {
      return null;
    }
  }

  async setBadgeCount(count: number): Promise<void> {
    try {
      await Notifications.setBadgeCountAsync(count);
    } catch {
      // Không hỗ trợ trên nền tảng/launcher này.
    }
  }
}
