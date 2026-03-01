import { Injectable, signal } from '@angular/core';

export interface AppNotification {
  id: number;
  severity: 'success' | 'info' | 'warn' | 'error';
  summary: string;
  detail: string;
  timestamp: Date;
}

@Injectable({ providedIn: 'root' })
export class NotificationService {
  private counter = 0;
  readonly notifications = signal<AppNotification[]>([]);

  success(summary: string, detail = ''): void {
    this.add('success', summary, detail);
  }

  info(summary: string, detail = ''): void {
    this.add('info', summary, detail);
  }

  warn(summary: string, detail = ''): void {
    this.add('warn', summary, detail);
  }

  error(summary: string, detail = ''): void {
    this.add('error', summary, detail);
  }

  dismiss(id: number): void {
    this.notifications.update(list => list.filter(n => n.id !== id));
  }

  private add(severity: AppNotification['severity'], summary: string, detail: string): void {
    const notification: AppNotification = {
      id: ++this.counter,
      severity,
      summary,
      detail,
      timestamp: new Date(),
    };
    this.notifications.update(list => [notification, ...list]);

    // Auto dismiss after 5s
    setTimeout(() => this.dismiss(notification.id), 5000);
  }
}
