import { Component, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterOutlet, RouterLink, RouterLinkActive } from '@angular/router';
import { MenubarModule } from 'primeng/menubar';
import { SidebarModule } from 'primeng/sidebar';
import { ButtonModule } from 'primeng/button';
import { AvatarModule } from 'primeng/avatar';
import { MenuModule } from 'primeng/menu';
import { MenuItem } from 'primeng/api';
import { AuthService } from '@core/services/auth.service';

@Component({
  selector: 'app-layout',
  standalone: true,
  imports: [
    CommonModule,
    RouterOutlet,
    RouterLink,
    RouterLinkActive,
    MenubarModule,
    SidebarModule,
    ButtonModule,
    AvatarModule,
    MenuModule,
  ],
  template: `
    <div class="layout-wrapper">
      <!-- Sidebar -->
      <aside class="layout-sidebar">
        <div class="sidebar-header">
          <h2>ClovUp</h2>
        </div>

        <nav class="sidebar-nav">
          @for (item of menuItems; track item.label) {
            <a
              [routerLink]="item.routerLink"
              routerLinkActive="active"
              class="nav-item"
            >
              <i [class]="item.icon"></i>
              <span>{{ item.label }}</span>
            </a>
          }
        </nav>

        <div class="sidebar-footer">
          <div class="user-info">
            <p-avatar
              [label]="userInitials()"
              shape="circle"
              size="normal"
            ></p-avatar>
            <div class="user-details">
              <span class="user-name">{{ user()?.first_name }} {{ user()?.last_name }}</span>
              <span class="user-role">{{ user()?.role }}</span>
            </div>
          </div>
          <p-button
            icon="pi pi-sign-out"
            [text]="true"
            severity="secondary"
            (onClick)="onLogout()"
            pTooltip="Изход"
          ></p-button>
        </div>
      </aside>

      <!-- Main content -->
      <main class="layout-main">
        <router-outlet></router-outlet>
      </main>
    </div>
  `,
  styles: [`
    .layout-wrapper {
      display: flex;
      min-height: 100vh;
    }

    .layout-sidebar {
      width: 260px;
      background: #1e293b;
      color: #e2e8f0;
      display: flex;
      flex-direction: column;
      position: fixed;
      top: 0;
      left: 0;
      bottom: 0;
      z-index: 100;
    }

    .sidebar-header {
      padding: 1.5rem;
      border-bottom: 1px solid #334155;

      h2 {
        margin: 0;
        font-size: 1.5rem;
        font-weight: 700;
        color: #fff;
      }
    }

    .sidebar-nav {
      flex: 1;
      padding: 0.5rem 0;
      overflow-y: auto;
    }

    .nav-item {
      display: flex;
      align-items: center;
      gap: 0.75rem;
      padding: 0.75rem 1.5rem;
      color: #94a3b8;
      text-decoration: none;
      transition: all 0.15s ease;
      font-size: 0.9rem;

      &:hover {
        background: #334155;
        color: #fff;
      }

      &.active {
        background: #3B82F6;
        color: #fff;
      }

      i {
        font-size: 1.1rem;
        width: 1.5rem;
        text-align: center;
      }
    }

    .sidebar-footer {
      padding: 1rem 1.5rem;
      border-top: 1px solid #334155;
      display: flex;
      align-items: center;
      justify-content: space-between;
    }

    .user-info {
      display: flex;
      align-items: center;
      gap: 0.75rem;
    }

    .user-details {
      display: flex;
      flex-direction: column;

      .user-name {
        font-size: 0.85rem;
        font-weight: 600;
        color: #fff;
      }
      .user-role {
        font-size: 0.7rem;
        color: #94a3b8;
        text-transform: uppercase;
      }
    }

    .layout-main {
      flex: 1;
      margin-left: 260px;
      padding: 1.5rem;
      background: var(--surface-ground);
      min-height: 100vh;
    }
  `],
})
export class LayoutComponent {
  user = this.auth.user;

  userInitials = computed(() => {
    const u = this.user();
    if (!u) return '?';
    return (u.first_name?.[0] ?? '') + (u.last_name?.[0] ?? '');
  });

  menuItems: { label: string; icon: string; routerLink: string }[] = [
    { label: 'Табло', icon: 'pi pi-chart-bar', routerLink: '/dashboard' },
    { label: 'POS Каса', icon: 'pi pi-calculator', routerLink: '/pos' },
    { label: 'Поръчки', icon: 'pi pi-shopping-cart', routerLink: '/orders' },
    { label: 'Каталог', icon: 'pi pi-box', routerLink: '/catalog' },
    { label: 'Клиенти', icon: 'pi pi-users', routerLink: '/clients' },
    { label: 'Инвентар', icon: 'pi pi-warehouse', routerLink: '/inventory' },
    { label: 'Отчети', icon: 'pi pi-chart-line', routerLink: '/reports' },
    { label: 'Настройки', icon: 'pi pi-cog', routerLink: '/settings' },
  ];

  constructor(private auth: AuthService) {}

  onLogout(): void {
    this.auth.logout();
  }
}
