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
import { ToastModule } from 'primeng/toast';
import { ToolbarModule } from 'primeng/toolbar';
import { MessageService } from 'primeng/api';
import { InventoryService } from '@core/services/inventory.service';
import { Stock, StockMovement, Supplier, Delivery } from '@core/models/inventory.model';

@Component({
  selector: 'app-inventory-list',
  standalone: true,
  imports: [
    CommonModule, FormsModule, TableModule, ButtonModule, InputTextModule,
    DialogModule, DropdownModule, InputNumberModule, TagModule, TabViewModule,
    ToastModule, ToolbarModule,
  ],
  providers: [MessageService],
  template: `
    <p-toast></p-toast>

    <div class="inventory-page">
      <p-tabView>
        <!-- Stock tab -->
        <p-tabPanel header="Наличности">
          <p-toolbar styleClass="mb-3">
            <ng-template pTemplate="left">
              <p-button label="Нисък запас" icon="pi pi-exclamation-triangle" severity="warning" [text]="true" (onClick)="loadLowStock()"></p-button>
            </ng-template>
            <ng-template pTemplate="right">
              <p-button label="Корекция" icon="pi pi-sliders-h" (onClick)="openAdjust()"></p-button>
            </ng-template>
          </p-toolbar>

          <p-table [value]="stocks()" [paginator]="true" [rows]="20" [loading]="loadingStocks()" dataKey="id" styleClass="p-datatable-sm">
            <ng-template pTemplate="header">
              <tr>
                <th pSortableColumn="product_name">Продукт <p-sortIcon field="product_name"></p-sortIcon></th>
                <th>Обект</th>
                <th pSortableColumn="quantity">Количество <p-sortIcon field="quantity"></p-sortIcon></th>
                <th>Мин. количество</th>
                <th>Статус</th>
              </tr>
            </ng-template>
            <ng-template pTemplate="body" let-stock>
              <tr>
                <td>{{ stock.product_name }}</td>
                <td>{{ stock.location_name }}</td>
                <td>{{ stock.quantity | number:'1.0-3' }}</td>
                <td>{{ stock.min_quantity | number:'1.0-3' }}</td>
                <td>
                  @if (stock.min_quantity > 0 && stock.quantity <= stock.min_quantity) {
                    <p-tag value="Нисък" severity="danger"></p-tag>
                  } @else {
                    <p-tag value="OK" severity="success"></p-tag>
                  }
                </td>
              </tr>
            </ng-template>
            <ng-template pTemplate="emptymessage">
              <tr><td colspan="5" class="text-center p-4">Няма налични данни.</td></tr>
            </ng-template>
          </p-table>
        </p-tabPanel>

        <!-- Movements tab -->
        <p-tabPanel header="Движения">
          <p-toolbar styleClass="mb-3">
            <ng-template pTemplate="left">
              <p-dropdown [options]="movementTypeOptions" [(ngModel)]="selectedMovementType" (onChange)="loadMovements()" placeholder="Всички типове" [showClear]="true" optionLabel="label" optionValue="value" styleClass="w-12rem"></p-dropdown>
            </ng-template>
          </p-toolbar>

          <p-table [value]="movements()" [paginator]="true" [rows]="20" [loading]="loadingMovements()" dataKey="id" styleClass="p-datatable-sm">
            <ng-template pTemplate="header">
              <tr>
                <th>Дата</th>
                <th>Продукт</th>
                <th>Обект</th>
                <th>Тип</th>
                <th>Количество</th>
                <th>Бележка</th>
              </tr>
            </ng-template>
            <ng-template pTemplate="body" let-mov>
              <tr>
                <td>{{ mov.created_at | date:'dd.MM.yyyy HH:mm' }}</td>
                <td>{{ mov.product_name }}</td>
                <td>{{ mov.location_name }}</td>
                <td>
                  <p-tag [value]="movementLabel(mov.movement_type)" [severity]="movementSeverity(mov.movement_type)"></p-tag>
                </td>
                <td [class]="mov.quantity >= 0 ? 'text-green-600' : 'text-red-600'">
                  {{ mov.quantity >= 0 ? '+' : '' }}{{ mov.quantity | number:'1.0-3' }}
                </td>
                <td>{{ mov.notes || '—' }}</td>
              </tr>
            </ng-template>
            <ng-template pTemplate="emptymessage">
              <tr><td colspan="6" class="text-center p-4">Няма движения.</td></tr>
            </ng-template>
          </p-table>
        </p-tabPanel>

        <!-- Suppliers tab -->
        <p-tabPanel header="Доставчици">
          <p-toolbar styleClass="mb-3">
            <ng-template pTemplate="right">
              <p-button label="Нов доставчик" icon="pi pi-plus" (onClick)="openSupplierDialog()"></p-button>
            </ng-template>
          </p-toolbar>

          <p-table [value]="suppliers()" [loading]="loadingSuppliers()" dataKey="id" styleClass="p-datatable-sm">
            <ng-template pTemplate="header">
              <tr>
                <th>Име</th>
                <th>Фирма</th>
                <th>ЕИК</th>
                <th>Телефон</th>
                <th>Имейл</th>
                <th>Статус</th>
                <th style="width: 8rem">Действия</th>
              </tr>
            </ng-template>
            <ng-template pTemplate="body" let-sup>
              <tr>
                <td>{{ sup.name }}</td>
                <td>{{ sup.company_name || '—' }}</td>
                <td>{{ sup.tax_number || '—' }}</td>
                <td>{{ sup.phone || '—' }}</td>
                <td>{{ sup.email || '—' }}</td>
                <td><p-tag [value]="sup.is_active ? 'Активен' : 'Неактивен'" [severity]="sup.is_active ? 'success' : 'danger'"></p-tag></td>
                <td>
                  <p-button icon="pi pi-pencil" [text]="true" (onClick)="openSupplierDialog(sup)" class="mr-1"></p-button>
                  <p-button icon="pi pi-trash" [text]="true" severity="danger" (onClick)="deleteSupplier(sup)"></p-button>
                </td>
              </tr>
            </ng-template>
            <ng-template pTemplate="emptymessage">
              <tr><td colspan="7" class="text-center p-4">Няма доставчици.</td></tr>
            </ng-template>
          </p-table>
        </p-tabPanel>

        <!-- Deliveries tab -->
        <p-tabPanel header="Доставки">
          <p-toolbar styleClass="mb-3">
            <ng-template pTemplate="right">
              <p-button label="Нова доставка" icon="pi pi-plus" (onClick)="openDeliveryDialog()"></p-button>
            </ng-template>
          </p-toolbar>

          <p-table [value]="deliveries()" [loading]="loadingDeliveries()" dataKey="id" styleClass="p-datatable-sm">
            <ng-template pTemplate="header">
              <tr>
                <th>Дата</th>
                <th>Фактура №</th>
                <th>Доставчик</th>
                <th>Обект</th>
                <th>Сума</th>
                <th>Статус</th>
                <th style="width: 10rem">Действия</th>
              </tr>
            </ng-template>
            <ng-template pTemplate="body" let-del>
              <tr>
                <td>{{ del.created_at | date:'dd.MM.yyyy' }}</td>
                <td>{{ del.invoice_number || '—' }}</td>
                <td>{{ del.supplier_name }}</td>
                <td>{{ del.location_name }}</td>
                <td>{{ del.total_cost | number:'1.2-2' }} лв.</td>
                <td><p-tag [value]="del.status === 'RECEIVED' ? 'Получена' : 'Чакаща'" [severity]="del.status === 'RECEIVED' ? 'success' : 'warning'"></p-tag></td>
                <td>
                  @if (del.status === 'PENDING') {
                    <p-button icon="pi pi-check" label="Получи" [text]="true" severity="success" (onClick)="receiveDelivery(del)"></p-button>
                  }
                </td>
              </tr>
            </ng-template>
            <ng-template pTemplate="emptymessage">
              <tr><td colspan="7" class="text-center p-4">Няма доставки.</td></tr>
            </ng-template>
          </p-table>
        </p-tabPanel>
      </p-tabView>
    </div>

    <!-- Adjustment dialog -->
    <p-dialog [(visible)]="adjustVisible" header="Корекция на запас" [modal]="true" [style]="{width:'400px'}" styleClass="p-fluid">
      <div class="flex flex-column gap-3 pt-3">
        <div class="field"><label>Продукт ID</label><p-inputNumber [(ngModel)]="adjustForm.product" [useGrouping]="false"></p-inputNumber></div>
        <div class="field"><label>Обект ID</label><p-inputNumber [(ngModel)]="adjustForm.location" [useGrouping]="false"></p-inputNumber></div>
        <div class="field"><label>Количество (+/-)</label><p-inputNumber [(ngModel)]="adjustForm.quantity" mode="decimal" [minFractionDigits]="0" [maxFractionDigits]="3"></p-inputNumber></div>
        <div class="field"><label>Тип</label>
          <p-dropdown [options]="adjustTypeOptions" [(ngModel)]="adjustForm.movement_type" optionLabel="label" optionValue="value"></p-dropdown>
        </div>
        <div class="field"><label>Бележка</label><input pInputText [(ngModel)]="adjustForm.notes" /></div>
      </div>
      <ng-template pTemplate="footer">
        <p-button label="Откажи" [text]="true" (onClick)="adjustVisible = false"></p-button>
        <p-button label="Запиши" icon="pi pi-check" (onClick)="doAdjust()"></p-button>
      </ng-template>
    </p-dialog>

    <!-- Supplier dialog -->
    <p-dialog [(visible)]="supplierVisible" [header]="editingSupplier ? 'Редакция на доставчик' : 'Нов доставчик'" [modal]="true" [style]="{width:'500px'}" styleClass="p-fluid">
      <div class="flex flex-column gap-3 pt-3">
        <div class="field"><label>Име *</label><input pInputText [(ngModel)]="supplierForm.name" /></div>
        <div class="field"><label>Фирма</label><input pInputText [(ngModel)]="supplierForm.company_name" /></div>
        <div class="field"><label>ЕИК</label><input pInputText [(ngModel)]="supplierForm.tax_number" /></div>
        <div class="field"><label>ДДС №</label><input pInputText [(ngModel)]="supplierForm.vat_number" /></div>
        <div class="field"><label>Лице за контакт</label><input pInputText [(ngModel)]="supplierForm.contact_person" /></div>
        <div class="field"><label>Телефон</label><input pInputText [(ngModel)]="supplierForm.phone" /></div>
        <div class="field"><label>Имейл</label><input pInputText [(ngModel)]="supplierForm.email" /></div>
        <div class="field"><label>Адрес</label><input pInputText [(ngModel)]="supplierForm.address" /></div>
        <div class="field"><label>Бележки</label><input pInputText [(ngModel)]="supplierForm.notes" /></div>
      </div>
      <ng-template pTemplate="footer">
        <p-button label="Откажи" [text]="true" (onClick)="supplierVisible = false"></p-button>
        <p-button label="Запиши" icon="pi pi-check" (onClick)="saveSupplier()"></p-button>
      </ng-template>
    </p-dialog>

    <!-- Delivery dialog -->
    <p-dialog [(visible)]="deliveryVisible" header="Нова доставка" [modal]="true" [style]="{width:'450px'}" styleClass="p-fluid">
      <div class="flex flex-column gap-3 pt-3">
        <div class="field"><label>Доставчик</label>
          <p-dropdown [options]="supplierOptions()" [(ngModel)]="deliveryForm.supplier" optionLabel="label" optionValue="value" placeholder="Избери" appendTo="body"></p-dropdown>
        </div>
        <div class="field"><label>Обект (location ID)</label><p-inputNumber [(ngModel)]="deliveryForm.location" [useGrouping]="false"></p-inputNumber></div>
        <div class="field"><label>Фактура №</label><input pInputText [(ngModel)]="deliveryForm.invoice_number" /></div>
        <div class="field"><label>Обща стойност</label><p-inputNumber [(ngModel)]="deliveryForm.total_cost" mode="decimal" [minFractionDigits]="2"></p-inputNumber></div>
        <div class="field"><label>Бележки</label><input pInputText [(ngModel)]="deliveryForm.notes" /></div>
      </div>
      <ng-template pTemplate="footer">
        <p-button label="Откажи" [text]="true" (onClick)="deliveryVisible = false"></p-button>
        <p-button label="Запиши" icon="pi pi-check" (onClick)="saveDelivery()"></p-button>
      </ng-template>
    </p-dialog>
  `,
  styles: [`.inventory-page { }`],
})
export class InventoryListComponent implements OnInit {
  stocks = signal<Stock[]>([]);
  movements = signal<StockMovement[]>([]);
  suppliers = signal<Supplier[]>([]);
  deliveries = signal<Delivery[]>([]);
  loadingStocks = signal(false);
  loadingMovements = signal(false);
  loadingSuppliers = signal(false);
  loadingDeliveries = signal(false);
  selectedMovementType: string | null = null;

  adjustVisible = false;
  adjustForm: any = { product: null, location: null, quantity: 0, movement_type: 'ADJUSTMENT', notes: '' };

  supplierVisible = false;
  editingSupplier: Supplier | null = null;
  supplierForm: any = {};

  deliveryVisible = false;
  deliveryForm: any = {};
  supplierOptions = signal<{ label: string; value: number }[]>([]);

  movementTypeOptions = [
    { label: 'Доставка', value: 'DELIVERY' },
    { label: 'Продажба', value: 'SALE' },
    { label: 'Сторно', value: 'VOID' },
    { label: 'Корекция', value: 'ADJUSTMENT' },
    { label: 'Брак', value: 'WASTE' },
    { label: 'Връщане', value: 'RETURN' },
  ];

  adjustTypeOptions = [
    { label: 'Корекция', value: 'ADJUSTMENT' },
    { label: 'Брак', value: 'WASTE' },
    { label: 'Връщане', value: 'RETURN' },
  ];

  constructor(
    private inventoryService: InventoryService,
    private messageService: MessageService,
  ) {}

  ngOnInit(): void {
    this.loadStocks();
    this.loadMovements();
    this.loadSuppliers();
    this.loadDeliveries();
  }

  loadStocks(): void {
    this.loadingStocks.set(true);
    this.inventoryService.getStocks().subscribe({
      next: (res) => { this.stocks.set(res.results); this.loadingStocks.set(false); },
      error: () => this.loadingStocks.set(false),
    });
  }

  loadLowStock(): void {
    this.loadingStocks.set(true);
    this.inventoryService.getLowStock().subscribe({
      next: (data) => { this.stocks.set(data); this.loadingStocks.set(false); },
      error: () => this.loadingStocks.set(false),
    });
  }

  loadMovements(): void {
    this.loadingMovements.set(true);
    const params: Record<string, string> = {};
    if (this.selectedMovementType) params['type'] = this.selectedMovementType;
    this.inventoryService.getMovements(params).subscribe({
      next: (res) => { this.movements.set(res.results); this.loadingMovements.set(false); },
      error: () => this.loadingMovements.set(false),
    });
  }

  openAdjust(): void {
    this.adjustForm = { product: null, location: null, quantity: 0, movement_type: 'ADJUSTMENT', notes: '' };
    this.adjustVisible = true;
  }

  doAdjust(): void {
    if (!this.adjustForm.product || !this.adjustForm.location) {
      this.messageService.add({ severity: 'warn', summary: 'Попълнете всички полета' });
      return;
    }
    this.inventoryService.adjustStock(this.adjustForm).subscribe({
      next: () => {
        this.adjustVisible = false;
        this.loadStocks();
        this.loadMovements();
        this.messageService.add({ severity: 'success', summary: 'Корекцията е записана' });
      },
      error: () => this.messageService.add({ severity: 'error', summary: 'Грешка' }),
    });
  }

  movementLabel(type: string): string {
    const map: Record<string, string> = {
      DELIVERY: 'Доставка', SALE: 'Продажба', VOID: 'Сторно',
      ADJUSTMENT: 'Корекция', TRANSFER_IN: 'Вход', TRANSFER_OUT: 'Изход',
      WASTE: 'Брак', RETURN: 'Връщане',
    };
    return map[type] || type;
  }

  movementSeverity(type: string): 'success' | 'info' | 'warning' | 'danger' {
    switch (type) {
      case 'DELIVERY': case 'RETURN': case 'TRANSFER_IN': return 'success';
      case 'SALE': return 'info';
      case 'WASTE': return 'danger';
      default: return 'warning';
    }
  }

  // ── Suppliers ──
  loadSuppliers(): void {
    this.loadingSuppliers.set(true);
    this.inventoryService.getSuppliers().subscribe({
      next: (res) => {
        this.suppliers.set(res.results);
        this.supplierOptions.set(res.results.map(s => ({ label: s.name, value: s.id })));
        this.loadingSuppliers.set(false);
      },
      error: () => this.loadingSuppliers.set(false),
    });
  }

  openSupplierDialog(sup?: Supplier): void {
    this.editingSupplier = sup || null;
    this.supplierForm = sup ? { ...sup } : { name: '', company_name: '', tax_number: '', vat_number: '', contact_person: '', phone: '', email: '', address: '', notes: '' };
    this.supplierVisible = true;
  }

  saveSupplier(): void {
    if (!this.supplierForm.name) { this.messageService.add({ severity: 'warn', summary: 'Въведете име' }); return; }
    const obs = this.editingSupplier
      ? this.inventoryService.updateSupplier(this.editingSupplier.id, this.supplierForm)
      : this.inventoryService.createSupplier(this.supplierForm);
    obs.subscribe({
      next: () => { this.supplierVisible = false; this.loadSuppliers(); this.messageService.add({ severity: 'success', summary: 'Доставчикът е запазен' }); },
      error: () => this.messageService.add({ severity: 'error', summary: 'Грешка' }),
    });
  }

  deleteSupplier(sup: Supplier): void {
    this.inventoryService.deleteSupplier(sup.id).subscribe({
      next: () => { this.loadSuppliers(); this.messageService.add({ severity: 'success', summary: 'Доставчикът е изтрит' }); },
      error: () => this.messageService.add({ severity: 'error', summary: 'Грешка' }),
    });
  }

  // ── Deliveries ──
  loadDeliveries(): void {
    this.loadingDeliveries.set(true);
    this.inventoryService.getDeliveries().subscribe({
      next: (res) => { this.deliveries.set(res.results); this.loadingDeliveries.set(false); },
      error: () => this.loadingDeliveries.set(false),
    });
  }

  openDeliveryDialog(): void {
    this.deliveryForm = { supplier: null, location: null, invoice_number: '', total_cost: 0, notes: '' };
    this.deliveryVisible = true;
  }

  saveDelivery(): void {
    if (!this.deliveryForm.supplier || !this.deliveryForm.location) { this.messageService.add({ severity: 'warn', summary: 'Попълнете всички полета' }); return; }
    this.inventoryService.createDelivery(this.deliveryForm).subscribe({
      next: () => { this.deliveryVisible = false; this.loadDeliveries(); this.messageService.add({ severity: 'success', summary: 'Доставката е записана' }); },
      error: () => this.messageService.add({ severity: 'error', summary: 'Грешка' }),
    });
  }

  receiveDelivery(del: Delivery): void {
    this.inventoryService.receiveDelivery(del.id).subscribe({
      next: () => { this.loadDeliveries(); this.loadStocks(); this.messageService.add({ severity: 'success', summary: 'Доставката е получена' }); },
      error: () => this.messageService.add({ severity: 'error', summary: 'Грешка' }),
    });
  }
}
