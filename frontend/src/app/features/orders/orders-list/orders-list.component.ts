import { Component, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { TableModule } from 'primeng/table';
import { ButtonModule } from 'primeng/button';
import { InputTextModule } from 'primeng/inputtext';
import { TagModule } from 'primeng/tag';
import { DropdownModule } from 'primeng/dropdown';
import { CalendarModule } from 'primeng/calendar';
import { DialogModule } from 'primeng/dialog';
import { ConfirmDialogModule } from 'primeng/confirmdialog';
import { ToastModule } from 'primeng/toast';
import { ToolbarModule } from 'primeng/toolbar';
import { ConfirmationService, MessageService } from 'primeng/api';
import { OrdersService } from '@core/services/orders.service';
import { Order, OrderStatus } from '@core/models/order.model';

@Component({
  selector: 'app-orders-list',
  standalone: true,
  imports: [
    CommonModule, FormsModule, TableModule, ButtonModule, InputTextModule,
    TagModule, DropdownModule, CalendarModule, DialogModule,
    ConfirmDialogModule, ToastModule, ToolbarModule,
  ],
  providers: [ConfirmationService, MessageService],
  template: `
    <p-toast></p-toast>
    <p-confirmDialog></p-confirmDialog>

    <div class="orders-page">
      <p-toolbar styleClass="mb-3">
        <ng-template pTemplate="left">
          <h2 class="m-0">Поръчки</h2>
        </ng-template>
      </p-toolbar>

      <p-table
        [value]="orders()"
        [paginator]="true"
        [rows]="20"
        [rowsPerPageOptions]="[10, 20, 50]"
        [loading]="loading()"
        dataKey="id"
        responsiveLayout="scroll"
        styleClass="p-datatable-sm"
      >
        <ng-template pTemplate="caption">
          <div class="flex justify-content-between align-items-center gap-3">
            <span class="p-input-icon-left">
              <i class="pi pi-search"></i>
              <input pInputText type="text" placeholder="Номер на поръчка..." [(ngModel)]="searchTerm" (input)="loadOrders()" />
            </span>
            <div class="flex gap-2 align-items-center">
              <p-dropdown
                [options]="statusOptions"
                [(ngModel)]="selectedStatus"
                (onChange)="loadOrders()"
                placeholder="Всички статуси"
                [showClear]="true"
                optionLabel="label"
                optionValue="value"
              ></p-dropdown>
              <p-calendar [(ngModel)]="dateFrom" (onSelect)="loadOrders()" dateFormat="yy-mm-dd" placeholder="От дата" [showIcon]="true" styleClass="w-10rem"></p-calendar>
              <p-calendar [(ngModel)]="dateTo" (onSelect)="loadOrders()" dateFormat="yy-mm-dd" placeholder="До дата" [showIcon]="true" styleClass="w-10rem"></p-calendar>
            </div>
          </div>
        </ng-template>

        <ng-template pTemplate="header">
          <tr>
            <th pSortableColumn="order_number">Номер <p-sortIcon field="order_number"></p-sortIcon></th>
            <th>Дата</th>
            <th>Тип</th>
            <th pSortableColumn="total">Сума <p-sortIcon field="total"></p-sortIcon></th>
            <th>Статус</th>
            <th style="width: 8rem">Действия</th>
          </tr>
        </ng-template>

        <ng-template pTemplate="body" let-order>
          <tr>
            <td>{{ order.order_number }}</td>
            <td>{{ order.created_at | date:'dd.MM.yyyy HH:mm' }}</td>
            <td>{{ orderTypeLabel(order.order_type) }}</td>
            <td>{{ order.total | number:'1.2-2' }} лв.</td>
            <td>
              <p-tag
                [value]="statusLabel(order.status)"
                [severity]="statusSeverity(order.status)"
              ></p-tag>
            </td>
            <td>
              <p-button
                icon="pi pi-eye"
                [text]="true"
                (onClick)="viewOrder(order)"
                class="mr-1"
              ></p-button>
              @if (order.status === 'PAID') {
                <p-button
                  icon="pi pi-ban"
                  [text]="true"
                  severity="danger"
                  pTooltip="Анулиране"
                  (onClick)="confirmVoid(order)"
                ></p-button>
              }
            </td>
          </tr>
        </ng-template>

        <ng-template pTemplate="emptymessage">
          <tr><td colspan="6" class="text-center p-4">Няма намерени поръчки.</td></tr>
        </ng-template>
      </p-table>
    </div>

    <!-- Order detail dialog -->
    <p-dialog
      [(visible)]="detailVisible"
      header="Детайли за поръчка"
      [modal]="true"
      [style]="{ width: '600px' }"
    >
      @if (selectedOrder) {
        <div class="flex flex-column gap-3">
          <div class="flex justify-content-between">
            <span><strong>Номер:</strong> {{ selectedOrder.order_number }}</span>
            <p-tag [value]="statusLabel(selectedOrder.status)" [severity]="statusSeverity(selectedOrder.status)"></p-tag>
          </div>
          <div><strong>Дата:</strong> {{ selectedOrder.created_at | date:'dd.MM.yyyy HH:mm:ss' }}</div>
          <div class="flex gap-4">
            <div><strong>Подсума:</strong> {{ selectedOrder.subtotal | number:'1.2-2' }} лв.</div>
            <div><strong>Отстъпка:</strong> {{ selectedOrder.discount | number:'1.2-2' }} лв.</div>
            <div><strong>Общо:</strong> {{ selectedOrder.total | number:'1.2-2' }} лв.</div>
          </div>
          @if (selectedOrder.void_reason) {
            <div class="text-red-500"><strong>Причина за анулиране:</strong> {{ selectedOrder.void_reason }}</div>
          }
          @if (selectedOrder.notes) {
            <div><strong>Бележка:</strong> {{ selectedOrder.notes }}</div>
          }
        </div>
      }
    </p-dialog>
  `,
  styles: [`
    .orders-page { h2 { margin: 0; font-weight: 600; } }
  `],
})
export class OrdersListComponent implements OnInit {
  orders = signal<Order[]>([]);
  loading = signal(false);
  searchTerm = '';
  selectedStatus: OrderStatus | null = null;
  dateFrom: Date | null = null;
  dateTo: Date | null = null;
  detailVisible = false;
  selectedOrder: Order | null = null;

  statusOptions = [
    { label: 'Отворена', value: 'OPEN' },
    { label: 'Платена', value: 'PAID' },
    { label: 'Анулирана', value: 'VOIDED' },
  ];

  constructor(
    private ordersService: OrdersService,
    private confirmationService: ConfirmationService,
    private messageService: MessageService,
  ) {}

  ngOnInit(): void {
    this.loadOrders();
  }

  loadOrders(): void {
    this.loading.set(true);
    const params: Record<string, string> = {};
    if (this.searchTerm) params['search'] = this.searchTerm;
    if (this.selectedStatus) params['status'] = this.selectedStatus;
    if (this.dateFrom) params['date_from'] = this.formatDate(this.dateFrom);
    if (this.dateTo) params['date_to'] = this.formatDate(this.dateTo);

    this.ordersService.getOrders(params).subscribe({
      next: (res) => { this.orders.set(res.results); this.loading.set(false); },
      error: () => this.loading.set(false),
    });
  }

  viewOrder(order: Order): void {
    this.selectedOrder = order;
    this.detailVisible = true;
  }

  confirmVoid(order: Order): void {
    this.confirmationService.confirm({
      message: `Анулиране на поръчка ${order.order_number}?`,
      header: 'Потвърждение',
      icon: 'pi pi-exclamation-triangle',
      acceptLabel: 'Да, анулирай',
      rejectLabel: 'Не',
      accept: () => {
        this.ordersService.voidOrder(order.id, 'Анулирана от бекофис').subscribe({
          next: () => {
            this.messageService.add({ severity: 'success', summary: 'Анулирана', detail: `Поръчка ${order.order_number} е анулирана.` });
            this.loadOrders();
          },
          error: () => {
            this.messageService.add({ severity: 'error', summary: 'Грешка', detail: 'Неуспешно анулиране.' });
          },
        });
      },
    });
  }

  statusLabel(status: string): string {
    switch (status) {
      case 'OPEN': return 'Отворена';
      case 'PAID': return 'Платена';
      case 'VOIDED': return 'Анулирана';
      default: return status;
    }
  }

  statusSeverity(status: string): 'success' | 'info' | 'warning' | 'danger' {
    switch (status) {
      case 'PAID': return 'success';
      case 'OPEN': return 'info';
      case 'VOIDED': return 'danger';
      default: return 'info';
    }
  }

  orderTypeLabel(type: string): string {
    switch (type) {
      case 'DINE_IN': return 'На място';
      case 'TAKEAWAY': return 'За вкъщи';
      case 'DELIVERY': return 'Доставка';
      case 'RETAIL': return 'Продажба';
      default: return type;
    }
  }

  private formatDate(d: Date): string {
    return d.toISOString().slice(0, 10);
  }
}
