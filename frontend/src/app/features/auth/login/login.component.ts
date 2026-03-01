import { Component, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { InputTextModule } from 'primeng/inputtext';
import { PasswordModule } from 'primeng/password';
import { ButtonModule } from 'primeng/button';
import { CardModule } from 'primeng/card';
import { MessagesModule } from 'primeng/messages';
import { AuthService } from '@core/services/auth.service';

@Component({
  selector: 'app-login',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    InputTextModule,
    PasswordModule,
    ButtonModule,
    CardModule,
    MessagesModule,
  ],
  template: `
    <div class="login-container">
      <p-card styleClass="login-card">
        <ng-template pTemplate="header">
          <div class="login-header">
            <h1>ClovUp</h1>
            <p>POS / BOS система</p>
          </div>
        </ng-template>

        <div class="login-form">
          @if (errorMessage()) {
            <div class="error-message">
              <i class="pi pi-exclamation-triangle"></i>
              {{ errorMessage() }}
            </div>
          }

          <div class="field">
            <label for="username">Потребител</label>
            <input
              id="username"
              type="text"
              pInputText
              [(ngModel)]="username"
              (keyup.enter)="onLogin()"
              placeholder="Потребителско име"
              class="w-full"
              [autofocus]="true"
            />
          </div>

          <div class="field">
            <label for="password">Парола</label>
            <p-password
              id="password"
              [(ngModel)]="password"
              (onKeyUp)="onEnterKey($event)"
              [feedback]="false"
              [toggleMask]="true"
              placeholder="Парола"
              styleClass="w-full"
              inputStyleClass="w-full"
            ></p-password>
          </div>

          <p-button
            label="Вход"
            icon="pi pi-sign-in"
            (onClick)="onLogin()"
            [loading]="loading()"
            styleClass="w-full"
          ></p-button>
        </div>
      </p-card>
    </div>
  `,
  styles: [`
    .login-container {
      display: flex;
      align-items: center;
      justify-content: center;
      min-height: 100vh;
      background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
    }

    :host ::ng-deep .login-card {
      width: 420px;
      max-width: 90vw;
    }

    .login-header {
      text-align: center;
      padding: 2rem 0 1rem;

      h1 {
        margin: 0;
        font-size: 2rem;
        font-weight: 700;
        color: var(--primary-color);
      }
      p {
        margin: 0.25rem 0 0;
        color: var(--text-color-secondary);
        font-size: 0.9rem;
      }
    }

    .login-form {
      display: flex;
      flex-direction: column;
      gap: 1.25rem;
    }

    .field {
      display: flex;
      flex-direction: column;
      gap: 0.5rem;

      label {
        font-weight: 600;
        font-size: 0.875rem;
      }
    }

    .error-message {
      background: #fff3f3;
      border: 1px solid #ffcdd2;
      border-radius: 6px;
      padding: 0.75rem 1rem;
      color: #c62828;
      font-size: 0.875rem;
      display: flex;
      align-items: center;
      gap: 0.5rem;
    }
  `],
})
export class LoginComponent {
  username = '';
  password = '';
  loading = signal(false);
  errorMessage = signal('');

  constructor(
    private auth: AuthService,
    private router: Router,
  ) {
    // Redirect if already logged in
    if (this.auth.isLoggedIn()) {
      this.router.navigate(['/dashboard']);
    }
  }

  onLogin(): void {
    if (!this.username || !this.password) {
      this.errorMessage.set('Моля, въведете потребител и парола.');
      return;
    }

    this.loading.set(true);
    this.errorMessage.set('');

    this.auth.login({ username: this.username, password: this.password }).subscribe({
      next: () => {
        this.loading.set(false);
        this.router.navigate(['/dashboard']);
      },
      error: (err: any) => {
        this.loading.set(false);
        this.errorMessage.set(err.message || 'Грешка при вход.');
      },
    });
  }

  onEnterKey(event: Event): void {
    if ((event as KeyboardEvent).key === 'Enter') {
      this.onLogin();
    }
  }
}
