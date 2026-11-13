import { Client, type StompSubscription } from '@stomp/stompjs';

import type { RealtimeClient, Unsubscribe } from './realtime-client';

interface Entry {
  destination: string;
  handler: (body: string) => void;
  active: StompSubscription | null;
}

/**
 * Adapter STOMP (@stomp/stompjs). Xác thực bằng header Authorization ở frame CONNECT với access token còn hạn
 * (lấy mới mỗi lần kết nối). Tự kết nối lại sau 5 giây, heartbeat 10 giây như web.
 */
export class StompRealtimeClient implements RealtimeClient {
  private client: Client | null = null;
  private readonly entries = new Set<Entry>();

  constructor(
    private readonly url: string,
    private readonly accessToken: () => Promise<string>,
  ) {}

  connect(): void {
    if (this.client) return;
    const client = new Client({
      brokerURL: this.url,
      reconnectDelay: 5000,
      heartbeatIncoming: 10_000,
      heartbeatOutgoing: 10_000,
      // React Native: WebSocket cần khung nhị phân và STOMP thêm ký tự NULL cuối khung nhận.
      forceBinaryWSFrames: true,
      appendMissingNULLonIncoming: true,
      beforeConnect: async () => {
        try {
          client.connectHeaders = { Authorization: `Bearer ${await this.accessToken()}` };
        } catch {
          // Hết phiên: để kết nối bị từ chối; UI sẽ ngắt kênh khi người dùng bị đưa về màn đăng nhập.
        }
      },
      onConnect: () => this.entries.forEach((entry) => this.attach(entry)),
      onWebSocketClose: () => this.entries.forEach((entry) => (entry.active = null)),
    });
    this.client = client;
    client.activate();
  }

  disconnect(): void {
    const client = this.client;
    this.client = null;
    this.entries.forEach((entry) => (entry.active = null));
    if (client) void client.deactivate();
  }

  subscribe(destination: string, handler: (body: string) => void): Unsubscribe {
    const entry: Entry = { destination, handler, active: null };
    this.entries.add(entry);
    if (this.client?.connected) this.attach(entry);
    return () => {
      this.entries.delete(entry);
      try {
        entry.active?.unsubscribe();
      } catch {
        // Kết nối đã đóng: không còn gì để hủy.
      }
      entry.active = null;
    };
  }

  private attach(entry: Entry): void {
    if (!this.client?.connected || entry.active) return;
    entry.active = this.client.subscribe(entry.destination, (message) =>
      entry.handler(message.body),
    );
  }
}
