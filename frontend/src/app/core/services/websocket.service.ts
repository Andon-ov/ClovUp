import { Injectable, OnDestroy, signal } from '@angular/core';
import { environment } from '@env/environment';
import { AuthService } from './auth.service';

export interface WsMessage {
  type: string;
  data: any;
}

@Injectable({ providedIn: 'root' })
export class WebSocketService implements OnDestroy {
  private ws: WebSocket | null = null;
  private reconnectTimer: any = null;

  readonly connected = signal(false);
  readonly lastMessage = signal<WsMessage | null>(null);

  constructor(private auth: AuthService) {}

  connect(): void {
    if (this.ws) return;

    const token = this.auth.getAccessToken();
    if (!token) return;

    const url = `${environment.wsUrl}/dashboard/?token=${token}`;
    this.ws = new WebSocket(url);

    this.ws.onopen = () => {
      this.connected.set(true);
      console.log('[WS] Connected');
    };

    this.ws.onmessage = (event) => {
      try {
        const msg: WsMessage = JSON.parse(event.data);
        this.lastMessage.set(msg);
      } catch (e) {
        console.error('[WS] Parse error', e);
      }
    };

    this.ws.onclose = () => {
      this.connected.set(false);
      this.ws = null;
      console.log('[WS] Disconnected — reconnecting in 5s');
      this.reconnectTimer = setTimeout(() => this.connect(), 5000);
    };

    this.ws.onerror = (err) => {
      console.error('[WS] Error', err);
      this.ws?.close();
    };
  }

  disconnect(): void {
    if (this.reconnectTimer) {
      clearTimeout(this.reconnectTimer);
      this.reconnectTimer = null;
    }
    this.ws?.close();
    this.ws = null;
    this.connected.set(false);
  }

  ngOnDestroy(): void {
    this.disconnect();
  }
}
