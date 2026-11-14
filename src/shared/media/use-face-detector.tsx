import { useCallback, useMemo, useRef, type ReactNode } from 'react';
import { Platform, View } from 'react-native';
import { WebView } from 'react-native-webview';

import { readEnv } from '@/core/config/env';

import type { FaceBox } from './face-crop';
import { buildFaceDetectorHtml, parseFaceDetectorMessage } from './face-detector-html';

const READY_TIMEOUT_MS = 25_000;
const DETECT_TIMEOUT_MS = 15_000;

type Status = 'loading' | 'ready' | 'unavailable';

/**
 * Dò khuôn mặt trong ảnh bằng WebView ẩn (MediaPipe như web). `view` phải được dựng trong cây giao diện khi cần dò;
 * `detect` nhận ảnh JPEG đã thu nhỏ (data URL) và trả các khung mặt theo toạ độ ảnh đó, hoặc null nếu không dò được
 * (không có mạng, chưa nạp được model, quá thời gian).
 */
export function useFaceDetector(): {
  view: ReactNode;
  detect: (dataUrl: string) => Promise<FaceBox[] | null>;
} {
  const webview = useRef<{ injectJavaScript: (script: string) => void } | null>(null);
  const status = useRef<Status>('loading');
  const waiters = useRef<(() => void)[]>([]);
  const pending = useRef(new Map<number, (faces: FaceBox[] | null) => void>());
  const nextId = useRef(1);
  const html = useMemo(() => buildFaceDetectorHtml(readEnv().siteOrigin), []);

  const settle = (next: Status) => {
    status.current = next;
    waiters.current.splice(0).forEach((resolve) => resolve());
  };

  const detect = useCallback(async (dataUrl: string): Promise<FaceBox[] | null> => {
    if (Platform.OS === 'web') return null;
    if (status.current === 'loading') {
      await new Promise<void>((resolve) => {
        waiters.current.push(resolve);
        setTimeout(resolve, READY_TIMEOUT_MS);
      });
    }
    if (status.current !== 'ready') return null;
    return new Promise<FaceBox[] | null>((resolve) => {
      const id = nextId.current++;
      const timer = setTimeout(() => {
        pending.current.delete(id);
        resolve(null);
      }, DETECT_TIMEOUT_MS);
      pending.current.set(id, (faces) => {
        clearTimeout(timer);
        resolve(faces);
      });
      webview.current?.injectJavaScript(`window.detect(${id}, ${JSON.stringify(dataUrl)}); true;`);
    });
  }, []);

  const view =
    Platform.OS === 'web' ? null : (
      <View
        pointerEvents="none"
        accessibilityElementsHidden
        importantForAccessibility="no-hide-descendants"
        style={{ width: 1, height: 1, opacity: 0, position: 'absolute' }}
      >
        <WebView
          ref={(instance) => {
            webview.current = instance;
          }}
          originWhitelist={['https://*', 'about:*']}
          source={{ html, baseUrl: readEnv().siteOrigin }}
          javaScriptEnabled
          onMessage={(event) => {
            const message = parseFaceDetectorMessage(event.nativeEvent.data);
            if (!message) return;
            if (message.type === 'ready') settle('ready');
            else if (message.type === 'unavailable') settle('unavailable');
            else {
              pending.current.get(message.id)?.(message.faces);
              pending.current.delete(message.id);
            }
          }}
          onError={() => settle('unavailable')}
        />
      </View>
    );

  return { view, detect };
}
