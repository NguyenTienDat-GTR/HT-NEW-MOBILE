export type Unsubscribe = () => void;

/**
 * Cổng kênh thời gian thực (BE dùng STOMP thuần qua WebSocket). Đăng ký (subscribe) trước hay sau khi connect đều được:
 * adapter nhớ các đăng ký và gắn lại mỗi lần kết nối lại.
 */
export interface RealtimeClient {
  connect(): void;
  disconnect(): void;
  /** `handler` nhận thân tin nhắn dạng chuỗi (JSON). */
  subscribe(destination: string, handler: (body: string) => void): Unsubscribe;
}

/** Các kênh BE cho phép đăng ký (WebSocketConfig của BE). */
export const REALTIME_DESTINATIONS = {
  notifications: '/user/queue/notifications',
  authEvents: '/user/queue/auth-events',
  certificateEvents: '/topic/certificate-events',
} as const;

export class NoopRealtimeClient implements RealtimeClient {
  connect(): void {}
  disconnect(): void {}
  subscribe(): Unsubscribe {
    return () => {};
  }
}
