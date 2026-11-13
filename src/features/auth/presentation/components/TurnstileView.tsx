import { useMemo } from 'react';
import { Platform, StyleSheet, View } from 'react-native';
import { WebView } from 'react-native-webview';

import { Banner } from '@/shared/ui/Banner';

import { buildTurnstileHtml, parseTurnstileMessage } from './turnstile-html';

export interface TurnstileViewProps {
  siteKey: string;
  /** Tên miền đã đăng ký khóa Turnstile; dùng làm baseUrl để vượt kiểm tra tên miền. */
  siteOrigin: string;
  /** Gọi với token khi xác minh xong; với null khi token hết hạn hoặc lỗi. */
  onToken: (token: string | null) => void;
  /** Đổi giá trị để bắt xác minh lại (token chỉ dùng được một lần). */
  resetSignal?: number;
}

const WIDGET_HEIGHT = 80;

export function TurnstileView({
  siteKey,
  siteOrigin,
  onToken,
  resetSignal = 0,
}: TurnstileViewProps) {
  const html = useMemo(() => buildTurnstileHtml(siteKey), [siteKey]);

  if (Platform.OS === 'web') {
    // WebView không chạy trên web; bản web chỉ để xem thử giao diện khi phát triển.
    return (
      <Banner
        tone="info"
        message="Xác minh bảo mật chỉ hoạt động trong ứng dụng trên điện thoại."
      />
    );
  }

  return (
    <View style={styles.box} accessibilityLabel="Xác minh bảo mật">
      <WebView
        // Đổi key để dựng lại widget và lấy token mới.
        key={`${siteKey}:${resetSignal}`}
        originWhitelist={['https://*', 'about:*']}
        source={{ html, baseUrl: siteOrigin }}
        javaScriptEnabled
        domStorageEnabled
        scrollEnabled={false}
        bounces={false}
        style={styles.web}
        onMessage={(event) => {
          const message = parseTurnstileMessage(event.nativeEvent.data);
          if (!message) return;
          onToken(message.type === 'token' ? message.token : null);
        }}
        onError={() => onToken(null)}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  box: { height: WIDGET_HEIGHT, alignItems: 'stretch' },
  web: { flex: 1, backgroundColor: 'transparent' },
});
