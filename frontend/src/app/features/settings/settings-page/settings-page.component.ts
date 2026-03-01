import { Component, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { TabViewModule } from 'primeng/tabview';
import { TableModule } from 'primeng/table';
import { ButtonModule } from 'primeng/button';
import { DialogModule } from 'primeng/dialog';
import { InputTextModule } from 'primeng/inputtext';
import { DropdownModule } from 'primeng/dropdown';
import { TagModule } from 'primeng/tag';
import { ConfirmDialogModule } from 'primeng/confirmdialog';
import { ToastModule } from 'primeng/toast';
import { ToolbarModule } from 'primeng/toolbar';
import { CheckboxModule } from 'primeng/checkbox';
import { CalendarModule } from 'primeng/calendar';
import { ConfirmationService, MessageService } from 'primeng/api';
import { TenantService } from '@core/services/tenant.service';
import { OrdersService } from '@core/services/orders.service';
import { Location, POSDevice, TenantUser, UserRole } from '@core/models/tenant.model';
import { AuditLogEntry } from '@core/models/order.model';

@Component({
  selector: 'app-settings-page',
  standalone: true,
  imports: [
    CommonModule, FormsModule, TabViewModule, TableModule, ButtonModule,
    DialogModule, InputTextModule, DropdownModule, TagModule, ConfirmDialogModule,
    ToastModule, ToolbarModule, CheckboxModule, CalendarModule,
  ],
  providers: [ConfirmationService, MessageService],
  template: `
    <p-toast></p-toast>
    <p-confirmDialog></p-confirmDialog>

    <h2 class="mt-0 mb-3" style="font-weight:600">Настройки</h2>

    <p-tabView>
      <!-- Locations -->
      <p-tabPanel header="Обекти">
        <p-toolbar styleClass="mb-3">
          <ng-template pTemplate="left"><span class="text-lg font-semibold">Обекти</span></ng-template>
          <ng-template pTemplate="right">
            <p-button label="Нов обект" icon="pi pi-plus" (onClick)="openLocationDialog()"></p-button>
          </ng-template>
        </p-toolbar>

        <p-table [value]="locations()" styleClass="p-datatable-sm p-datatable-striped">
          <ng-template pTemplate="header">
            <tr><th>Име</th><th>Адрес</th><th>Град</th><th>Обект (Н-18)</th><th style="width:8rem"></th></tr>
          </ng-template>
          <ng-template pTemplate="body" let-l>
            <tr>
              <td>{{ l.name }}</td>
              <td>{{ l.address }}</td>
              <td>{{ l.city }}</td>
              <td>{{ l.object_name }}</td>
              <td class="text-right">
                <p-button icon="pi pi-pencil" [rounded]="true" [text]="true" severity="info" (onClick)="openLocationDialog(l)"></p-button>
                <p-button icon="pi pi-trash" [rounded]="true" [text]="true" severity="danger" (onClick)="confirmDeleteLocation(l)"></p-button>
              </td>
            </tr>
          </ng-template>
          <ng-template pTemplate="emptymessage">
            <tr><td colspan="5" class="text-center p-4">Няма обекти.</td></tr>
          </ng-template>
        </p-table>
      </p-tabPanel>

      <!-- Devices -->
      <p-tabPanel header="Устройства">
        <p-toolbar styleClass="mb-3">
          <ng-template pTemplate="left"><span class="text-lg font-semibold">POS Устройства</span></ng-template>
          <ng-template pTemplate="right">
            <p-button label="Ново устройство" icon="pi pi-plus" (onClick)="openDeviceDialog()"></p-button>
          </ng-template>
        </p-toolbar>

        <p-table [value]="devices()" styleClass="p-datatable-sm p-datatable-striped">
          <ng-template pTemplate="header">
            <tr><th>Логическо име</th><th>Дисплей име</th><th>Онлайн</th><th>Последно видяно</th><th style="width:8rem"></th></tr>
          </ng-template>
          <ng-template pTemplate="body" let-d>
            <tr>
              <td>{{ d.logical_name }}</td>
              <td>{{ d.display_name }}</td>
              <td><p-tag [value]="d.is_online ? 'Да' : 'Не'" [severity]="d.is_online ? 'success' : 'danger'"></p-tag></td>
              <td>{{ d.last_seen_at ? (d.last_seen_at | date:'dd.MM.yyyy HH:mm') : '—' }}</td>
              <td class="text-right">
                <p-button icon="pi pi-pencil" [rounded]="true" [text]="true" severity="info" (onClick)="openDeviceDialog(d)"></p-button>
                <p-button icon="pi pi-trash" [rounded]="true" [text]="true" severity="danger" (onClick)="confirmDeleteDevice(d)"></p-button>
              </td>
            </tr>
          </ng-template>
          <ng-template pTemplate="emptymessage">
            <tr><td colspan="5" class="text-center p-4">Няма устройства.</td></tr>
          </ng-template>
        </p-table>
      </p-tabPanel>

      <!-- Users -->
      <p-tabPanel header="Потребители">
        <p-toolbar styleClass="mb-3">
          <ng-template pTemplate="left"><span class="text-lg font-semibold">Потребители</span></ng-template>
          <ng-template pTemplate="right">
            <p-button label="Нов потребител" icon="pi pi-plus" (onClick)="openUserDialog()"></p-button>
          </ng-template>
        </p-toolbar>

        <p-table [value]="users()" styleClass="p-datatable-sm p-datatable-striped">
          <ng-template pTemplate="header">
            <tr><th>Потребител</th><th>Имена</th><th>Имейл</th><th>Роля</th><th>Активен</th><th style="width:8rem"></th></tr>
          </ng-template>
          <ng-template pTemplate="body" let-u>
            <tr>
              <td>{{ u.username }}</td>
              <td>{{ u.first_name }} {{ u.last_name }}</td>
              <td>{{ u.email }}</td>
              <td><p-tag [value]="roleLabel(u.role)" [severity]="roleSeverity(u.role)"></p-tag></td>
              <td><p-tag [value]="u.is_active ? 'Да' : 'Не'" [severity]="u.is_active ? 'success' : 'danger'"></p-tag></td>
              <td class="text-right">
                <p-button icon="pi pi-pencil" [rounded]="true" [text]="true" severity="info" (onClick)="openUserDialog(u)"></p-button>
              </td>
            </tr>
          </ng-template>
          <ng-template pTemplate="emptymessage">
            <tr><td colspan="6" class="text-center p-4">Няма потребители.</td></tr>
          </ng-template>
        </p-table>
      </p-tabPanel>

      <!-- Audit Log -->
      <p-tabPanel header="Одитен лог">
        <p-toolbar styleClass="mb-3">
          <ng-template pTemplate="left">
            <span class="text-lg font-semibold">Одитен лог</span>
          </ng-template>
          <ng-template pTemplate="right">
            <div class="flex gap-2 align-items-center">
              <input pInputText placeholder="Потребител..." [(ngModel)]="auditSearch" (input)="loadAuditLogs()" style="width:150px" />
              <p-dropdown [options]="auditActionOptions" [(ngModel)]="auditAction" (onChange)="loadAuditLogs()" placeholder="Действие" [showClear]="true" optionLabel="label" optionValue="value" styleClass="w-10rem"></p-dropdown>
            </div>
          </ng-template>
        </p-toolbar>

        <p-table [value]="auditLogs()" [paginator]="true" [rows]="25" [loading]="loadingAudit()" dataKey="id" styleClass="p-datatable-sm">
          <ng-template pTemplate="header">
            <tr>
              <th>Дата</th>
              <th>Потребител</th>
              <th>Действие</th>
              <th>Модел</th>
              <th>Обект ID</th>
              <th>IP</th>
              <th>Промени</th>
            </tr>
          </ng-template>
          <ng-template pTemplate="body" let-log>
            <tr>
              <td>{{ log.created_at | date:'dd.MM.yyyy HH:mm:ss' }}</td>
              <td>{{ log.username || '—' }}</td>
              <td>
                <p-tag [value]="log.action" [severity]="auditSeverity(log.action)"></p-tag>
              </td>
              <td>{{ log.model_name }}</td>
              <td>{{ log.object_id }}</td>
              <td>{{ log.ip_address || '—' }}</td>
              <td style="max-width:200px;overflow:hidden;text-overflow:ellipsis">{{ log.changes | json }}</td>
            </tr>
          </ng-template>
          <ng-template pTemplate="emptymessage">
            <tr><td colspan="7" class="text-center p-4">Няма записи в одитния лог.</td></tr>
          </ng-template>
        </p-table>
      </p-tabPanel>
    </p-tabView>

    <!-- Location Dialog -->
    <p-dialog [(visible)]="showLocationDialog" [header]="editingLocation ? 'Редактирай обект' : 'Нов обект'" [modal]="true" [style]="{ width: '480px' }">
      <div class="flex flex-column gap-3 pt-2">
        <div class="flex flex-column gap-1"><label>Име *</label><input pInputText [(ngModel)]="locationForm.name" /></div>
        <div class="flex flex-column gap-1"><label>Адрес</label><input pInputText [(ngModel)]="locationForm.address" /></div>
        <div class="flex flex-column gap-1"><label>Град</label><input pInputText [(ngModel)]="locationForm.city" /></div>
        <div class="flex flex-column gap-1"><label>Обект (Н-18)</label><input pInputText [(ngModel)]="locationForm.object_name" /></div>
      </div>
      <ng-template pTemplate="footer">
        <p-button label="Отказ" severity="secondary" [text]="true" (onClick)="showLocationDialog = false"></p-button>
        <p-button label="Запази" icon="pi pi-check" (onClick)="saveLocation()"></p-button>
      </ng-template>
    </p-dialog>

    <!-- Device Dialog -->
    <p-dialog [(visible)]="showDeviceDialog" [header]="editingDevice ? 'Редактирай устройство' : 'Ново устройство'" [modal]="true" [style]="{ width: '480px' }">
      <div class="flex flex-column gap-3 pt-2">
        <div class="flex flex-column gap-1"><label>Логическо име *</label><input pInputText [(ngModel)]="deviceForm.logical_name" /></div>
        <div class="flex flex-column gap-1"><label>Дисплей име</label><input pInputText [(ngModel)]="deviceForm.display_name" /></div>
        <div class="flex flex-column gap-1"><label>Обект</label>
          <p-dropdown [options]="locationOptions()" [(ngModel)]="deviceForm.location" optionLabel="label" optionValue="value" placeholder="Избери обект"></p-dropdown>
        </div>
        <div class="flex flex-column gap-1"><label>Бележки</label><input pInputText [(ngModel)]="deviceForm.notes" /></div>
      </div>
      <ng-template pTemplate="footer">
        <p-button label="Отказ" severity="secondary" [text]="true" (onClick)="showDeviceDialog = false"></p-button>
        <p-button label="Запази" icon="pi pi-check" (onClick)="saveDevice()"></p-button>
      </ng-template>
    </p-dialog>

    <!-- User Dialog -->
    <p-dialog [(visible)]="showUserDialog" [header]="editingUser ? 'Редактирай потребител' : 'Нов потребител'" [modal]="true" [style]="{ width: '520px' }">
      <div class="flex flex-column gap-3 pt-2">
        <div class="flex flex-column gap-1"><label>Потребителско име *</label><input pInputText [(ngModel)]="userForm.username" /></div>
        <div class="grid">
          <div class="col-6 flex flex-column gap-1"><label>Име</label><input pInputText [(ngModel)]="userForm.first_name" /></div>
          <div class="col-6 flex flex-column gap-1"><label>Фамилия</label><input pInputText [(ngModel)]="userForm.last_name" /></div>
        </div>
        <div class="flex flex-column gap-1"><label>Имейл</label><input pInputText [(ngModel)]="userForm.email" /></div>
        @if (!editingUser) {
          <div class="flex flex-column gap-1"><label>Парола *</label><input pInputText type="password" [(ngModel)]="userForm.password" /></div>
        }
        <div class="flex flex-column gap-1"><label>Роля *</label>
          <p-dropdown [options]="roleOptions" [(ngModel)]="userForm.role" optionLabel="label" optionValue="value" placeholder="Избери роля"></p-dropdown>
        </div>
        <div class="flex flex-column gap-1"><label>Номер на карта</label><input pInputText [(ngModel)]="userForm.card_number" /></div>
        <div class="flex align-items-center gap-2">
          <p-checkbox [(ngModel)]="userForm.is_active" [binary]="true" inputId="activeChk"></p-checkbox>
          <label for="activeChk">Активен</label>
        </div>
      </div>
      <ng-template pTemplate="footer">
        <p-button label="Отказ" severity="secondary" [text]="true" (onClick)="showUserDialog = false"></p-button>
        <p-button label="Запази" icon="pi pi-check" (onClick)="saveUser()"></p-button>
      </ng-template>
    </p-dialog>
  `,
  styles: [``],
})
export class SettingsPageComponent implements OnInit {
  locations = signal<Location[]>([]);
  devices = signal<POSDevice[]>([]);
  users = signal<TenantUser[]>([]);
  auditLogs = signal<AuditLogEntry[]>([]);
  loadingAudit = signal(false);
  auditSearch = '';
  auditAction: string | null = null;
  auditActionOptions = [
    { label: 'Създаване', value: 'CREATE' },
    { label: 'Обновяване', value: 'UPDATE' },
    { label: 'Изтриване', value: 'DELETE' },
    { label: 'Вход', value: 'LOGIN' },
  ];

  // location dialog
  showLocationDialog = false;
  editingLocation: Location | null = null;
  locationForm: any = {};

  // device dialog
  showDeviceDialog = false;
  editingDevice: POSDevice | null = null;
  deviceForm: any = {};

  // user dialog
  showUserDialog = false;
  editingUser: TenantUser | null = null;
  userForm: any = {};

  roleOptions = [
    { label: 'Собственик', value: 'OWNER' },
    { label: 'Мениджър', value: 'MANAGER' },
    { label: 'Касиер', value: 'CASHIER' },
    { label: 'Счетоводител', value: 'ACCOUNTANT' },
    { label: 'Одитор', value: 'AUDITOR' },
  ];

  locationOptions = signal<{ label: string; value: number }[]>([]);

  constructor(
    private tenantService: TenantService,
    private ordersService: OrdersService,
    private confirmationService: ConfirmationService,
    private messageService: MessageService,
  ) {}

  ngOnInit(): void {
    this.loadLocations();
    this.loadDevices();
    this.loadUsers();
    this.loadAuditLogs();
  }

  // ── Locations ──
  loadLocations(): void {
    this.tenantService.getLocations().subscribe(r => {
      this.locations.set(r.results);
      this.locationOptions.set(r.results.map(l => ({ label: l.name, value: l.id })));
    });
  }

  openLocationDialog(loc?: Location): void {
    this.editingLocation = loc || null;
    this.locationForm = loc ? { ...loc } : { name: '', address: '', city: '', object_name: '' };
    this.showLocationDialog = true;
  }

  saveLocation(): void {
    const obs = this.editingLocation
      ? this.tenantService.updateLocation(this.editingLocation.id, this.locationForm)
      : this.tenantService.createLocation(this.locationForm);
    obs.subscribe({
      next: () => { this.showLocationDialog = false; this.loadLocations(); this.msg('success', 'Обектът е запазен.'); },
      error: () => this.msg('error', 'Грешка при запис.'),
    });
  }

  confirmDeleteLocation(loc: Location): void {
    this.confirmationService.confirm({
      message: `Изтриване на "${loc.name}"?`,
      accept: () => {
        this.tenantService.deleteLocation(loc.id).subscribe({
          next: () => { this.loadLocations(); this.msg('success', 'Обектът е изтрит.'); },
          error: () => this.msg('error', 'Грешка при изтриване.'),
        });
      },
    });
  }

  // ── Devices ──
  loadDevices(): void {
    this.tenantService.getDevices().subscribe(r => this.devices.set(r.results));
  }

  openDeviceDialog(dev?: POSDevice): void {
    this.editingDevice = dev || null;
    this.deviceForm = dev ? { ...dev } : { logical_name: '', display_name: '', location: null, notes: '' };
    this.showDeviceDialog = true;
  }

  saveDevice(): void {
    const obs = this.editingDevice
      ? this.tenantService.updateDevice(this.editingDevice.id, this.deviceForm)
      : this.tenantService.createDevice(this.deviceForm);
    obs.subscribe({
      next: () => { this.showDeviceDialog = false; this.loadDevices(); this.msg('success', 'Устройството е запазено.'); },
      error: () => this.msg('error', 'Грешка при запис.'),
    });
  }

  confirmDeleteDevice(dev: POSDevice): void {
    this.confirmationService.confirm({
      message: `Изтриване на "${dev.display_name || dev.logical_name}"?`,
      accept: () => {
        this.tenantService.deleteDevice(dev.id).subscribe({
          next: () => { this.loadDevices(); this.msg('success', 'Устройството е изтрито.'); },
          error: () => this.msg('error', 'Грешка при изтриване.'),
        });
      },
    });
  }

  // ── Users ──
  loadUsers(): void {
    this.tenantService.getUsers().subscribe(r => this.users.set(r.results));
  }

  openUserDialog(usr?: TenantUser): void {
    this.editingUser = usr || null;
    this.userForm = usr
      ? { ...usr }
      : { username: '', first_name: '', last_name: '', email: '', password: '', role: 'CASHIER', card_number: '', is_active: true };
    this.showUserDialog = true;
  }

  saveUser(): void {
    const obs = this.editingUser
      ? this.tenantService.updateUser(this.editingUser.id, this.userForm)
      : this.tenantService.createUser(this.userForm);
    obs.subscribe({
      next: () => { this.showUserDialog = false; this.loadUsers(); this.msg('success', 'Потребителят е запазен.'); },
      error: () => this.msg('error', 'Грешка при запис.'),
    });
  }

  roleLabel(role: UserRole): string {
    const m: Record<UserRole, string> = { OWNER: 'Собственик', MANAGER: 'Мениджър', CASHIER: 'Касиер', ACCOUNTANT: 'Счетоводител', AUDITOR: 'Одитор' };
    return m[role] || role;
  }

  roleSeverity(role: UserRole): 'success' | 'info' | 'warning' | 'danger' {
    switch (role) { case 'OWNER': return 'danger'; case 'MANAGER': return 'warning'; case 'CASHIER': return 'info'; default: return 'success'; }
  }

  // ── Audit Log ──
  loadAuditLogs(): void {
    this.loadingAudit.set(true);
    const params: Record<string, string> = {};
    if (this.auditSearch) params['search'] = this.auditSearch;
    if (this.auditAction) params['action'] = this.auditAction;
    this.ordersService.getAuditLogs(params).subscribe({
      next: (res) => { this.auditLogs.set(res.results); this.loadingAudit.set(false); },
      error: () => this.loadingAudit.set(false),
    });
  }

  auditSeverity(action: string): 'success' | 'info' | 'warning' | 'danger' {
    switch (action) {
      case 'CREATE': return 'success';
      case 'UPDATE': return 'info';
      case 'DELETE': return 'danger';
      case 'LOGIN': return 'warning';
      default: return 'info';
    }
  }

  private msg(severity: string, detail: string): void {
    this.messageService.add({ severity, summary: severity === 'success' ? 'Успех' : 'Грешка', detail, life: 3000 });
  }
}
