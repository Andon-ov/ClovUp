import { Component, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { TableModule } from 'primeng/table';
import { ButtonModule } from 'primeng/button';
import { InputTextModule } from 'primeng/inputtext';
import { DialogModule } from 'primeng/dialog';
import { DropdownModule } from 'primeng/dropdown';
import { InputNumberModule } from 'primeng/inputnumber';
import { TagModule } from 'primeng/tag';
import { TabViewModule } from 'primeng/tabview';
import { ConfirmDialogModule } from 'primeng/confirmdialog';
import { ToastModule } from 'primeng/toast';
import { ToolbarModule } from 'primeng/toolbar';
import { ConfirmationService, MessageService } from 'primeng/api';
import { ClientsService } from '@core/services/clients.service';
import { ClientAccount, ClientGroup, SpendingLimit, Blacklist } from '@core/models/client.model';

@Component({
  selector: 'app-clients-list',
  standalone: true,
  imports: [
    CommonModule, FormsModule, TableModule, ButtonModule, InputTextModule,
    DialogModule, DropdownModule, InputNumberModule, TagModule, TabViewModule,
    ConfirmDialogModule, ToastModule, ToolbarModule,
  ],
  providers: [ConfirmationService, MessageService],
  template: `
    <p-toast></p-toast>
    <p-confirmDialog></p-confirmDialog>

    <div class="clients-page">
      <p-tabView>
        <!-- Accounts tab -->
        <p-tabPanel header="Клиентски сметки">
          <p-toolbar styleClass="mb-3">
            <ng-template pTemplate="left">
              <span class="p-input-icon-left">
                <i class="pi pi-search"></i>
                <input pInputText type="text" placeholder="Търсене..." [(ngModel)]="accountSearch" (input)="loadAccounts()" />
              </span>
            </ng-template>
            <ng-template pTemplate="right">
              <p-button label="Нова сметка" icon="pi pi-plus" (onClick)="openNewAccount()"></p-button>
            </ng-template>
          </p-toolbar>

          <p-table
            [value]="accounts()"
            [paginator]="true" [rows]="20"
            [loading]="loadingAccounts()"
            dataKey="id" styleClass="p-datatable-sm"
          >
            <ng-template pTemplate="header">
              <tr>
                <th>Име</th>
                <th>Група</th>
                <th>Карта</th>
                <th>Баланс 1</th>
                <th>Баланс 2</th>
                <th>Статус</th>
                <th style="width: 12rem">Действия</th>
              </tr>
            </ng-template>
            <ng-template pTemplate="body" let-acc>
              <tr>
                <td>{{ acc.name }}</td>
                <td>{{ acc.group_name || '—' }}</td>
                <td>{{ acc.card_number || '—' }}</td>
                <td>{{ acc.balance_1 | number:'1.2-2' }} лв.</td>
                <td>{{ acc.balance_2 | number:'1.2-2' }} лв.</td>
                <td>
                  <p-tag
                    [value]="acc.is_blocked ? 'Блокиран' : 'Активен'"
                    [severity]="acc.is_blocked ? 'danger' : 'success'"
                  ></p-tag>
                </td>
                <td>
                  <p-button icon="pi pi-pencil" [text]="true" (onClick)="editAccount(acc)" class="mr-1"></p-button>
                  <p-button icon="pi pi-wallet" [text]="true" severity="success" pTooltip="Зареждане" (onClick)="openTopUp(acc)" class="mr-1"></p-button>
                  @if (!acc.is_blocked) {
                    <p-button icon="pi pi-lock" [text]="true" severity="danger" pTooltip="Блокирай" (onClick)="blockAccount(acc)"></p-button>
                  }
                </td>
              </tr>
            </ng-template>
            <ng-template pTemplate="emptymessage">
              <tr><td colspan="7" class="text-center p-4">Няма клиентски сметки.</td></tr>
            </ng-template>
          </p-table>
        </p-tabPanel>

        <!-- Groups tab -->
        <p-tabPanel header="Клиентски групи">
          <p-toolbar styleClass="mb-3">
            <ng-template pTemplate="right">
              <p-button label="Нова група" icon="pi pi-plus" (onClick)="openNewGroup()"></p-button>
            </ng-template>
          </p-toolbar>

          <p-table [value]="groups()" [loading]="loadingGroups()" dataKey="id" styleClass="p-datatable-sm">
            <ng-template pTemplate="header">
              <tr>
                <th>Име</th>
                <th>Кредит</th>
                <th>Овърдрафт</th>
                <th>Отстъпка при отваряне</th>
                <th style="width: 8rem">Действия</th>
              </tr>
            </ng-template>
            <ng-template pTemplate="body" let-group>
              <tr>
                <td>{{ group.name }}</td>
                <td>
                  <p-tag [value]="group.credit_allowed ? 'Да' : 'Не'" [severity]="group.credit_allowed ? 'success' : 'warning'"></p-tag>
                </td>
                <td>{{ group.overdraft_limit | number:'1.2-2' }} лв.</td>
                <td>{{ group.discount_on_open }}%</td>
                <td>
                  <p-button icon="pi pi-pencil" [text]="true" (onClick)="editGroup(group)" class="mr-1"></p-button>
                  <p-button icon="pi pi-trash" [text]="true" severity="danger" (onClick)="confirmDeleteGroup(group)"></p-button>
                </td>
              </tr>
            </ng-template>
            <ng-template pTemplate="emptymessage">
              <tr><td colspan="5" class="text-center p-4">Няма клиентски групи.</td></tr>
            </ng-template>
          </p-table>
        </p-tabPanel>

        <!-- Spending Limits tab -->
        <p-tabPanel header="Лимити">
          <p-toolbar styleClass="mb-3">
            <ng-template pTemplate="right">
              <p-button label="Нов лимит" icon="pi pi-plus" (onClick)="openLimitDialog()"></p-button>
            </ng-template>
          </p-toolbar>

          <p-table [value]="spendingLimits()" [loading]="loadingLimits()" dataKey="id" styleClass="p-datatable-sm">
            <ng-template pTemplate="header">
              <tr>
                <th>Име</th>
                <th>Сума</th>
                <th>Тип</th>
                <th>Валиден от</th>
                <th>Валиден до</th>
                <th style="width: 6rem">Действия</th>
              </tr>
            </ng-template>
            <ng-template pTemplate="body" let-lim>
              <tr>
                <td>{{ lim.name }}</td>
                <td>{{ lim.amount | number:'1.2-2' }} лв.</td>
                <td>
                  <p-tag [value]="limitTypeLabel(lim.limit_type)"></p-tag>
                </td>
                <td>{{ lim.valid_from ? (lim.valid_from | date:'dd.MM.yyyy') : '—' }}</td>
                <td>{{ lim.valid_to ? (lim.valid_to | date:'dd.MM.yyyy') : '—' }}</td>
                <td>
                  <p-button icon="pi pi-trash" [text]="true" severity="danger" (onClick)="confirmDeleteLimit(lim)"></p-button>
                </td>
              </tr>
            </ng-template>
            <ng-template pTemplate="emptymessage">
              <tr><td colspan="6" class="text-center p-4">Няма лимити.</td></tr>
            </ng-template>
          </p-table>
        </p-tabPanel>

        <!-- Blacklist tab -->
        <p-tabPanel header="Черен списък">
          <p-toolbar styleClass="mb-3">
            <ng-template pTemplate="right">
              <p-button label="Добави в черен списък" icon="pi pi-plus" severity="danger" (onClick)="openBlacklistDialog()"></p-button>
            </ng-template>
          </p-toolbar>

          <p-table [value]="blacklistEntries()" [loading]="loadingBlacklist()" dataKey="id" styleClass="p-datatable-sm">
            <ng-template pTemplate="header">
              <tr>
                <th>Карта</th>
                <th>Сметка</th>
                <th>Причина</th>
                <th>Дата</th>
                <th style="width: 6rem">Действия</th>
              </tr>
            </ng-template>
            <ng-template pTemplate="body" let-bl>
              <tr>
                <td>{{ bl.card_number || '—' }}</td>
                <td>{{ bl.account_name || '—' }}</td>
                <td>{{ bl.reason }}</td>
                <td>{{ bl.blocked_at | date:'dd.MM.yyyy HH:mm' }}</td>
                <td>
                  <p-button icon="pi pi-trash" [text]="true" severity="danger" pTooltip="Премахни" (onClick)="removeFromBlacklist(bl)"></p-button>
                </td>
              </tr>
            </ng-template>
            <ng-template pTemplate="emptymessage">
              <tr><td colspan="5" class="text-center p-4">Черният списък е празен.</td></tr>
            </ng-template>
          </p-table>
        </p-tabPanel>
      </p-tabView>
    </div>

    <!-- Account dialog -->
    <p-dialog [(visible)]="accountDialogVisible" [header]="editModeAcc ? 'Редакция на сметка' : 'Нова сметка'" [modal]="true" [style]="{width:'450px'}" styleClass="p-fluid">
      <div class="flex flex-column gap-3 pt-3">
        <div class="field"><label>Име *</label><input pInputText [(ngModel)]="accForm.name" /></div>
        <div class="field"><label>Фирма</label><input pInputText [(ngModel)]="accForm.company_name" /></div>
        <div class="field"><label>Група</label>
          <p-dropdown [options]="groupOptions()" [(ngModel)]="accForm.client_group" placeholder="Без група" [showClear]="true" optionLabel="label" optionValue="value"></p-dropdown>
        </div>
        <div class="field"><label>Бележки</label><input pInputText [(ngModel)]="accForm.notes" /></div>
      </div>
      <ng-template pTemplate="footer">
        <p-button label="Откажи" icon="pi pi-times" [text]="true" (onClick)="accountDialogVisible = false"></p-button>
        <p-button label="Запиши" icon="pi pi-check" (onClick)="saveAccount()"></p-button>
      </ng-template>
    </p-dialog>

    <!-- Top-up dialog -->
    <p-dialog [(visible)]="topUpVisible" header="Зареждане на баланс" [modal]="true" [style]="{width:'350px'}" styleClass="p-fluid">
      <div class="flex flex-column gap-3 pt-3">
        <div class="field"><label>Сума</label>
          <p-inputNumber [(ngModel)]="topUpAmount" mode="decimal" [minFractionDigits]="2" [maxFractionDigits]="2" [min]="0.01"></p-inputNumber>
        </div>
      </div>
      <ng-template pTemplate="footer">
        <p-button label="Откажи" [text]="true" (onClick)="topUpVisible = false"></p-button>
        <p-button label="Зареди" icon="pi pi-wallet" (onClick)="doTopUp()"></p-button>
      </ng-template>
    </p-dialog>

    <!-- Group dialog -->
    <p-dialog [(visible)]="groupDialogVisible" [header]="editModeGroup ? 'Редакция на група' : 'Нова група'" [modal]="true" [style]="{width:'450px'}" styleClass="p-fluid">
      <div class="flex flex-column gap-3 pt-3">
        <div class="field"><label>Име *</label><input pInputText [(ngModel)]="groupForm.name" /></div>
        <div class="field"><label>Описание</label><input pInputText [(ngModel)]="groupForm.description" /></div>
      </div>
      <ng-template pTemplate="footer">
        <p-button label="Откажи" [text]="true" (onClick)="groupDialogVisible = false"></p-button>
        <p-button label="Запиши" icon="pi pi-check" (onClick)="saveGroup()"></p-button>
      </ng-template>
    </p-dialog>

    <!-- Spending Limit dialog -->
    <p-dialog [(visible)]="limitDialogVisible" header="Нов лимит за харчене" [modal]="true" [style]="{width:'450px'}" styleClass="p-fluid">
      <div class="flex flex-column gap-3 pt-3">
        <div class="field"><label>Име *</label><input pInputText [(ngModel)]="limitForm.name" /></div>
        <div class="field"><label>Сума *</label>
          <p-inputNumber [(ngModel)]="limitForm.amount" mode="decimal" [minFractionDigits]="2" [min]="0.01"></p-inputNumber>
        </div>
        <div class="field"><label>Тип *</label>
          <p-dropdown [options]="limitTypeOptions" [(ngModel)]="limitForm.limit_type" optionLabel="label" optionValue="value"></p-dropdown>
        </div>
      </div>
      <ng-template pTemplate="footer">
        <p-button label="Откажи" [text]="true" (onClick)="limitDialogVisible = false"></p-button>
        <p-button label="Запиши" icon="pi pi-check" (onClick)="saveLimit()"></p-button>
      </ng-template>
    </p-dialog>

    <!-- Blacklist dialog -->
    <p-dialog [(visible)]="blacklistDialogVisible" header="Добавяне в черен списък" [modal]="true" [style]="{width:'450px'}" styleClass="p-fluid">
      <div class="flex flex-column gap-3 pt-3">
        <div class="field"><label>Клиентска сметка (ID)</label>
          <p-inputNumber [(ngModel)]="blacklistForm.client_account" [useGrouping]="false"></p-inputNumber>
        </div>
        <div class="field"><label>Причина *</label><input pInputText [(ngModel)]="blacklistForm.reason" /></div>
      </div>
      <ng-template pTemplate="footer">
        <p-button label="Откажи" [text]="true" (onClick)="blacklistDialogVisible = false"></p-button>
        <p-button label="Добави" icon="pi pi-ban" severity="danger" (onClick)="saveBlacklist()"></p-button>
      </ng-template>
    </p-dialog>
  `,
  styles: [`.clients-page { h2 { margin: 0; font-weight: 600; } }`],
})
export class ClientsListComponent implements OnInit {
  accounts = signal<ClientAccount[]>([]);
  groups = signal<ClientGroup[]>([]);
  loadingAccounts = signal(false);
  loadingGroups = signal(false);
  accountSearch = '';

  accountDialogVisible = false;
  editModeAcc = false;
  accForm: any = {};

  topUpVisible = false;
  topUpAmount = 0;
  topUpAccountId: number | null = null;

  groupDialogVisible = false;
  editModeGroup = false;
  groupForm: any = {};

  // Spending Limits
  spendingLimits = signal<SpendingLimit[]>([]);
  loadingLimits = signal(false);
  limitDialogVisible = false;
  limitForm: any = {};
  limitTypeOptions = [
    { label: 'Дневен', value: 'DAILY' },
    { label: 'Седмичен', value: 'WEEKLY' },
    { label: 'Месечен', value: 'MONTHLY' },
  ];

  // Blacklist
  blacklistEntries = signal<Blacklist[]>([]);
  loadingBlacklist = signal(false);
  blacklistDialogVisible = false;
  blacklistForm: any = {};

  groupOptions = signal<{ label: string; value: number }[]>([]);

  constructor(
    private clientsService: ClientsService,
    private confirmationService: ConfirmationService,
    private messageService: MessageService,
  ) {}

  ngOnInit(): void {
    this.loadAccounts();
    this.loadGroups();
    this.loadLimits();
    this.loadBlacklist();
  }

  loadAccounts(): void {
    this.loadingAccounts.set(true);
    const params: Record<string, string> = {};
    if (this.accountSearch) params['search'] = this.accountSearch;
    this.clientsService.getAccounts(params).subscribe({
      next: (res) => { this.accounts.set(res.results); this.loadingAccounts.set(false); },
      error: () => this.loadingAccounts.set(false),
    });
  }

  loadGroups(): void {
    this.loadingGroups.set(true);
    this.clientsService.getGroups().subscribe({
      next: (res) => {
        this.groups.set(res.results);
        this.groupOptions.set(res.results.map(g => ({ label: g.name, value: g.id })));
        this.loadingGroups.set(false);
      },
      error: () => this.loadingGroups.set(false),
    });
  }

  openNewAccount(): void {
    this.accForm = { name: '', company_name: '', client_group: null, notes: '' };
    this.editModeAcc = false;
    this.accountDialogVisible = true;
  }

  editAccount(acc: ClientAccount): void {
    this.accForm = { ...acc };
    this.editModeAcc = true;
    this.accountDialogVisible = true;
  }

  saveAccount(): void {
    if (!this.accForm.name) { this.messageService.add({ severity: 'warn', summary: 'Въведете име' }); return; }
    const obs = this.editModeAcc
      ? this.clientsService.updateAccount(this.accForm.id, this.accForm)
      : this.clientsService.createAccount(this.accForm);
    obs.subscribe({
      next: () => { this.accountDialogVisible = false; this.loadAccounts(); this.messageService.add({ severity: 'success', summary: 'Запазено' }); },
      error: () => this.messageService.add({ severity: 'error', summary: 'Грешка' }),
    });
  }

  openTopUp(acc: ClientAccount): void {
    this.topUpAccountId = acc.id;
    this.topUpAmount = 0;
    this.topUpVisible = true;
  }

  doTopUp(): void {
    if (!this.topUpAccountId || this.topUpAmount <= 0) return;
    this.clientsService.topUp(this.topUpAccountId, this.topUpAmount).subscribe({
      next: () => { this.topUpVisible = false; this.loadAccounts(); this.messageService.add({ severity: 'success', summary: 'Баланс зареден' }); },
      error: () => this.messageService.add({ severity: 'error', summary: 'Грешка' }),
    });
  }

  blockAccount(acc: ClientAccount): void {
    this.confirmationService.confirm({
      message: `Блокиране на "${acc.name}"?`, header: 'Потвърждение', acceptLabel: 'Да', rejectLabel: 'Не',
      accept: () => {
        this.clientsService.blockAccount(acc.id).subscribe({
          next: () => { this.loadAccounts(); this.messageService.add({ severity: 'success', summary: 'Блокиран' }); },
        });
      },
    });
  }

  openNewGroup(): void {
    this.groupForm = { name: '', description: '' };
    this.editModeGroup = false;
    this.groupDialogVisible = true;
  }

  editGroup(group: ClientGroup): void {
    this.groupForm = { ...group };
    this.editModeGroup = true;
    this.groupDialogVisible = true;
  }

  saveGroup(): void {
    if (!this.groupForm.name) { this.messageService.add({ severity: 'warn', summary: 'Въведете име' }); return; }
    const obs = this.editModeGroup
      ? this.clientsService.updateGroup(this.groupForm.id, this.groupForm)
      : this.clientsService.createGroup(this.groupForm);
    obs.subscribe({
      next: () => { this.groupDialogVisible = false; this.loadGroups(); this.messageService.add({ severity: 'success', summary: 'Запазено' }); },
      error: () => this.messageService.add({ severity: 'error', summary: 'Грешка' }),
    });
  }

  confirmDeleteGroup(group: ClientGroup): void {
    this.confirmationService.confirm({
      message: `Изтриване на група "${group.name}"?`, header: 'Потвърждение', acceptLabel: 'Да', rejectLabel: 'Не',
      accept: () => {
        this.clientsService.deleteGroup(group.id).subscribe({
          next: () => { this.loadGroups(); this.messageService.add({ severity: 'success', summary: 'Изтрита' }); },
        });
      },
    });
  }

  // ── Spending Limits ──
  loadLimits(): void {
    this.loadingLimits.set(true);
    this.clientsService.getSpendingLimits().subscribe({
      next: (res) => { this.spendingLimits.set(res.results); this.loadingLimits.set(false); },
      error: () => this.loadingLimits.set(false),
    });
  }

  openLimitDialog(): void {
    this.limitForm = { name: '', amount: 0, limit_type: 'DAILY' };
    this.limitDialogVisible = true;
  }

  saveLimit(): void {
    if (!this.limitForm.name || !this.limitForm.amount) { this.messageService.add({ severity: 'warn', summary: 'Попълнете всички полета' }); return; }
    this.clientsService.createSpendingLimit(this.limitForm).subscribe({
      next: () => { this.limitDialogVisible = false; this.loadLimits(); this.messageService.add({ severity: 'success', summary: 'Лимитът е създаден' }); },
      error: () => this.messageService.add({ severity: 'error', summary: 'Грешка' }),
    });
  }

  confirmDeleteLimit(lim: SpendingLimit): void {
    this.confirmationService.confirm({
      message: `Изтриване на лимит "${lim.name}"?`, header: 'Потвърждение', acceptLabel: 'Да', rejectLabel: 'Не',
      accept: () => {
        this.clientsService.deleteSpendingLimit(lim.id).subscribe({
          next: () => { this.loadLimits(); this.messageService.add({ severity: 'success', summary: 'Лимитът е изтрит' }); },
        });
      },
    });
  }

  limitTypeLabel(type: string): string {
    const m: Record<string, string> = { DAILY: 'Дневен', WEEKLY: 'Седмичен', MONTHLY: 'Месечен' };
    return m[type] || type;
  }

  // ── Blacklist ──
  loadBlacklist(): void {
    this.loadingBlacklist.set(true);
    this.clientsService.getBlacklist().subscribe({
      next: (res) => { this.blacklistEntries.set(res.results); this.loadingBlacklist.set(false); },
      error: () => this.loadingBlacklist.set(false),
    });
  }

  openBlacklistDialog(): void {
    this.blacklistForm = { client_account: null, reason: '' };
    this.blacklistDialogVisible = true;
  }

  saveBlacklist(): void {
    if (!this.blacklistForm.reason) { this.messageService.add({ severity: 'warn', summary: 'Въведете причина' }); return; }
    this.clientsService.addToBlacklist(this.blacklistForm).subscribe({
      next: () => { this.blacklistDialogVisible = false; this.loadBlacklist(); this.messageService.add({ severity: 'success', summary: 'Добавен в черен списък' }); },
      error: () => this.messageService.add({ severity: 'error', summary: 'Грешка' }),
    });
  }

  removeFromBlacklist(bl: Blacklist): void {
    this.confirmationService.confirm({
      message: 'Премахване от черен списък?', header: 'Потвърждение', acceptLabel: 'Да', rejectLabel: 'Не',
      accept: () => {
        this.clientsService.removeFromBlacklist(bl.id).subscribe({
          next: () => { this.loadBlacklist(); this.messageService.add({ severity: 'success', summary: 'Премахнат от черен списък' }); },
        });
      },
    });
  }
}
