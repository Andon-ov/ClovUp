import { Component, OnInit, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { ButtonModule } from 'primeng/button';
import { InputTextModule } from 'primeng/inputtext';
import { DialogModule } from 'primeng/dialog';
import { DropdownModule } from 'primeng/dropdown';
import { InputNumberModule } from 'primeng/inputnumber';
import { ToastModule } from 'primeng/toast';
import { BadgeModule } from 'primeng/badge';
import { DividerModule } from 'primeng/divider';
import { TagModule } from 'primeng/tag';
import { ScrollPanelModule } from 'primeng/scrollpanel';
import { ConfirmDialogModule } from 'primeng/confirmdialog';
import { ConfirmationService, MessageService } from 'primeng/api';
import { CatalogService } from '@core/services/catalog.service';
import { PosService, CreateOrderItemRequest, AddPaymentRequest } from '@core/services/pos.service';
import { Product, ProductCategory } from '@core/models/product.model';
import { AuthService } from '@core/services/auth.service';
import { v4 as uuidv4 } from 'uuid';

interface CartItem {
  product: Product;
  quantity: number;
  discount_pct: number;
  notes: string;
  lineTotal: number;
}

@Component({
  selector: 'app-pos',
  standalone: true,
  imports: [
    CommonModule, FormsModule, ButtonModule, InputTextModule, DialogModule,
    DropdownModule, InputNumberModule, ToastModule, BadgeModule, DividerModule,
    TagModule, ScrollPanelModule, ConfirmDialogModule,
  ],
  providers: [ConfirmationService, MessageService],
  template: `
    <p-toast position="top-center"></p-toast>
    <p-confirmDialog></p-confirmDialog>

    <div class="pos-layout">
      <!-- LEFT: Product Grid (65%) -->
      <div class="pos-products">
        <!-- Top bar -->
        <div class="pos-topbar">
          <div class="flex align-items-center gap-2">
            <p-button icon="pi pi-arrow-left" [rounded]="true" [text]="true" severity="secondary" (onClick)="goBack()"></p-button>
            <span class="pos-title">POS Каса</span>
          </div>
          <div class="flex align-items-center gap-2">
            <span class="p-input-icon-left">
              <i class="pi pi-search"></i>
              <input pInputText [(ngModel)]="searchTerm" (input)="filterProducts()" placeholder="Баркод / Име..." class="pos-search" />
            </span>
          </div>
          <div class="flex align-items-center gap-2">
            <p-tag [value]="currentUser()" icon="pi pi-user"></p-tag>
          </div>
        </div>

        <!-- Category tabs -->
        <div class="pos-categories">
          <button class="cat-btn" [class.active]="!selectedCategory()" (click)="selectCategory(null)">Всички</button>
          @for (cat of categories(); track cat.id) {
            <button class="cat-btn" [class.active]="selectedCategory()?.id === cat.id"
                    [style.border-bottom-color]="cat.color || '#3B82F6'"
                    (click)="selectCategory(cat)">
              {{ cat.name }}
            </button>
          }
        </div>

        <!-- Product grid -->
        <div class="pos-grid">
          @for (p of filteredProducts(); track p.id) {
            <button class="product-btn" (click)="addToCart(p)" [class.inactive]="!p.is_active">
              <span class="product-name">{{ p.name }}</span>
              <span class="product-price">{{ p.price | number:'1.2-2' }} лв.</span>
              <span class="product-vat">{{ p.vat_group }}</span>
            </button>
          }
          @if (filteredProducts().length === 0) {
            <div class="no-products">Няма намерени артикули</div>
          }
        </div>
      </div>

      <!-- RIGHT: Order Summary (35%) -->
      <div class="pos-cart">
        <div class="cart-header">
          <h3>Текуща поръчка</h3>
          <p-button icon="pi pi-trash" severity="danger" [text]="true" [rounded]="true"
                    [disabled]="cart().length === 0" (onClick)="clearCart()"></p-button>
        </div>

        <!-- Order type selector -->
        <div class="order-type-bar">
          @for (t of orderTypes; track t.value) {
            <button class="type-btn" [class.active]="orderType() === t.value" (click)="orderType.set(t.value)">
              {{ t.label }}
            </button>
          }
        </div>

        <!-- Cart items -->
        <div class="cart-items">
          @for (item of cart(); track item.product.id; let i = $index) {
            <div class="cart-item">
              <div class="cart-item-info">
                <span class="cart-item-name">{{ item.product.name }}</span>
                <div class="cart-item-controls">
                  <button class="qty-btn" (click)="changeQty(i, -1)">−</button>
                  <span class="qty-display">{{ item.quantity }}</span>
                  <button class="qty-btn" (click)="changeQty(i, 1)">+</button>
                  <span class="cart-item-price">{{ item.lineTotal | number:'1.2-2' }} лв.</span>
                  <button class="remove-btn" (click)="removeFromCart(i)"><i class="pi pi-times"></i></button>
                </div>
              </div>
              @if (item.discount_pct > 0) {
                <span class="discount-tag">-{{ item.discount_pct }}%</span>
              }
            </div>
          }
          @if (cart().length === 0) {
            <div class="empty-cart">
              <i class="pi pi-shopping-cart" style="font-size:2rem;opacity:0.3"></i>
              <p>Добавете артикули</p>
            </div>
          }
        </div>

        <!-- Totals -->
        <div class="cart-totals">
          <div class="total-row"><span>Междинна сума</span><span>{{ subtotal() | number:'1.2-2' }} лв.</span></div>
          @if (totalDiscount() > 0) {
            <div class="total-row discount"><span>Отстъпка</span><span>-{{ totalDiscount() | number:'1.2-2' }} лв.</span></div>
          }
          <p-divider></p-divider>
          <div class="total-row grand"><span>ОБЩО</span><span>{{ grandTotal() | number:'1.2-2' }} лв.</span></div>
        </div>

        <!-- Action buttons -->
        <div class="cart-actions">
          <p-button label="Отстъпка" icon="pi pi-percentage" severity="warning" styleClass="w-full"
                    [disabled]="cart().length === 0" (onClick)="showDiscountDialog = true"></p-button>
          <p-button label="Плащане" icon="pi pi-credit-card" severity="success" styleClass="w-full pos-pay-btn"
                    [disabled]="cart().length === 0" (onClick)="openPaymentDialog()"></p-button>
        </div>

        <!-- Quick actions -->
        <div class="cart-quick">
          <p-button label="Служ. въвеждане" icon="pi pi-download" severity="info" [text]="true" size="small"
                    (onClick)="showSafeInDialog = true"></p-button>
          <p-button label="Служ. извеждане" icon="pi pi-upload" severity="info" [text]="true" size="small"
                    (onClick)="showSafeOutDialog = true"></p-button>
        </div>
      </div>
    </div>

    <!-- Payment Dialog -->
    <p-dialog [(visible)]="showPaymentDialog" header="Плащане" [modal]="true" [style]="{ width: '500px' }" [closable]="true">
      <div class="payment-dialog">
        <div class="payment-total">
          <span>За плащане:</span>
          <span class="payment-amount">{{ grandTotal() | number:'1.2-2' }} лв.</span>
        </div>

        <div class="payment-methods">
          @for (m of paymentMethods; track m.value) {
            <button class="payment-method-btn" [class.active]="selectedPayment() === m.value"
                    (click)="selectedPayment.set(m.value)">
              <i [class]="m.icon"></i>
              <span>{{ m.label }}</span>
            </button>
          }
        </div>

        @if (selectedPayment() === 'CASH') {
          <div class="cash-section">
            <label>Получена сума:</label>
            <p-inputNumber [ngModel]="cashReceived()" (ngModelChange)="cashReceived.set($event)" [min]="0" mode="decimal"
                           [minFractionDigits]="2" [maxFractionDigits]="2" inputStyleClass="w-full text-2xl text-center"></p-inputNumber>
            <div class="change-display" [class.negative]="changeAmount() < 0">
              <span>Ресто:</span>
              <span>{{ changeAmount() | number:'1.2-2' }} лв.</span>
            </div>
            <div class="quick-cash">
              @for (q of quickCashAmounts(); track q) {
                <button class="quick-cash-btn" (click)="cashReceived.set(q)">{{ q | number:'1.2-2' }}</button>
              }
            </div>
          </div>
        }

        <div class="flex justify-content-end gap-2 mt-3">
          <p-button label="Отказ" severity="secondary" [text]="true" (onClick)="showPaymentDialog = false"></p-button>
          <p-button label="Приключи" icon="pi pi-check" severity="success"
                    [disabled]="!canPay()" (onClick)="processPayment()"></p-button>
        </div>
      </div>
    </p-dialog>

    <!-- Discount Dialog -->
    <p-dialog [(visible)]="showDiscountDialog" header="Отстъпка на цялата поръчка" [modal]="true" [style]="{ width: '380px' }">
      <div class="flex flex-column gap-3 pt-2">
        <label>Процент отстъпка (%):</label>
        <p-inputNumber [(ngModel)]="discountPercent" [min]="0" [max]="100" suffix="%" inputStyleClass="w-full"></p-inputNumber>
      </div>
      <ng-template pTemplate="footer">
        <p-button label="Отказ" severity="secondary" [text]="true" (onClick)="showDiscountDialog = false"></p-button>
        <p-button label="Приложи" icon="pi pi-check" (onClick)="applyDiscount()"></p-button>
      </ng-template>
    </p-dialog>

    <!-- Safe In Dialog -->
    <p-dialog [(visible)]="showSafeInDialog" header="Служебно въвеждане" [modal]="true" [style]="{ width: '380px' }">
      <div class="flex flex-column gap-3 pt-2">
        <label>Сума:</label>
        <p-inputNumber [(ngModel)]="safeAmount" [min]="0.01" mode="decimal" [minFractionDigits]="2" inputStyleClass="w-full"></p-inputNumber>
        <label>Бележка:</label>
        <input pInputText [(ngModel)]="safeNotes" class="w-full" />
      </div>
      <ng-template pTemplate="footer">
        <p-button label="Отказ" severity="secondary" [text]="true" (onClick)="showSafeInDialog = false"></p-button>
        <p-button label="Въведи" icon="pi pi-check" (onClick)="executeSafeIn()"></p-button>
      </ng-template>
    </p-dialog>

    <!-- Safe Out Dialog -->
    <p-dialog [(visible)]="showSafeOutDialog" header="Служебно извеждане" [modal]="true" [style]="{ width: '380px' }">
      <div class="flex flex-column gap-3 pt-2">
        <label>Сума:</label>
        <p-inputNumber [(ngModel)]="safeAmount" [min]="0.01" mode="decimal" [minFractionDigits]="2" inputStyleClass="w-full"></p-inputNumber>
        <label>Бележка:</label>
        <input pInputText [(ngModel)]="safeNotes" class="w-full" />
      </div>
      <ng-template pTemplate="footer">
        <p-button label="Отказ" severity="secondary" [text]="true" (onClick)="showSafeOutDialog = false"></p-button>
        <p-button label="Изведи" icon="pi pi-check" severity="warning" (onClick)="executeSafeOut()"></p-button>
      </ng-template>
    </p-dialog>
  `,
  styles: [`
    .pos-layout {
      display: flex; height: 100vh; overflow: hidden; background: var(--surface-ground);
    }
    .pos-products { flex: 0 0 65%; display: flex; flex-direction: column; border-right: 1px solid var(--surface-border); }
    .pos-cart { flex: 0 0 35%; display: flex; flex-direction: column; background: var(--surface-card); }

    .pos-topbar {
      display: flex; align-items: center; justify-content: space-between;
      padding: 0.5rem 1rem; background: var(--surface-card); border-bottom: 1px solid var(--surface-border);
    }
    .pos-title { font-size: 1.2rem; font-weight: 700; }
    .pos-search { width: 250px; }

    .pos-categories {
      display: flex; gap: 0; overflow-x: auto; background: var(--surface-card);
      border-bottom: 1px solid var(--surface-border); padding: 0 0.5rem;
    }
    .cat-btn {
      padding: 0.6rem 1rem; border: none; background: none; cursor: pointer;
      font-size: 0.85rem; font-weight: 500; white-space: nowrap;
      border-bottom: 3px solid transparent; color: var(--text-color-secondary);
      transition: all 0.2s;
      &.active { color: var(--primary-color); border-bottom-color: var(--primary-color); font-weight: 600; }
    }

    .pos-grid {
      flex: 1; overflow-y: auto; padding: 0.75rem;
      display: grid; grid-template-columns: repeat(auto-fill, minmax(130px, 1fr));
      gap: 0.5rem; align-content: start;
    }
    .product-btn {
      display: flex; flex-direction: column; align-items: center; justify-content: center;
      padding: 0.75rem 0.5rem; border-radius: 8px; border: 1px solid var(--surface-border);
      background: var(--surface-card); cursor: pointer; min-height: 80px;
      transition: all 0.15s; text-align: center;
      &:active { transform: scale(0.95); background: var(--primary-100); }
      &.inactive { opacity: 0.4; }
    }
    .product-name { font-size: 0.8rem; font-weight: 600; line-height: 1.2; margin-bottom: 4px; }
    .product-price { font-size: 0.9rem; color: var(--primary-color); font-weight: 700; }
    .product-vat { font-size: 0.65rem; color: var(--text-color-secondary); }
    .no-products { grid-column: 1 / -1; text-align: center; padding: 3rem; color: var(--text-color-secondary); }

    .cart-header {
      display: flex; justify-content: space-between; align-items: center;
      padding: 0.75rem 1rem; border-bottom: 1px solid var(--surface-border);
      h3 { margin: 0; font-size: 1rem; }
    }
    .order-type-bar {
      display: flex; gap: 0; border-bottom: 1px solid var(--surface-border);
    }
    .type-btn {
      flex: 1; padding: 0.5rem; border: none; background: none; cursor: pointer;
      font-size: 0.75rem; font-weight: 500; color: var(--text-color-secondary);
      border-bottom: 2px solid transparent;
      &.active { color: var(--primary-color); border-bottom-color: var(--primary-color); font-weight: 600; }
    }

    .cart-items { flex: 1; overflow-y: auto; padding: 0.5rem; }
    .cart-item {
      padding: 0.5rem; border-bottom: 1px solid var(--surface-border);
    }
    .cart-item-info { display: flex; flex-direction: column; gap: 0.25rem; }
    .cart-item-name { font-size: 0.85rem; font-weight: 500; }
    .cart-item-controls {
      display: flex; align-items: center; gap: 0.5rem;
    }
    .qty-btn {
      width: 28px; height: 28px; border-radius: 50%; border: 1px solid var(--surface-border);
      background: var(--surface-ground); cursor: pointer; font-size: 1rem; font-weight: 700;
      display: flex; align-items: center; justify-content: center;
    }
    .qty-display { font-weight: 600; min-width: 24px; text-align: center; }
    .cart-item-price { margin-left: auto; font-weight: 600; color: var(--primary-color); }
    .remove-btn { border: none; background: none; cursor: pointer; color: var(--red-500); padding: 4px; }
    .discount-tag { font-size: 0.7rem; color: var(--orange-500); font-weight: 600; }
    .empty-cart { display: flex; flex-direction: column; align-items: center; justify-content: center; height: 200px; color: var(--text-color-secondary); }

    .cart-totals { padding: 0.75rem 1rem; border-top: 1px solid var(--surface-border); }
    .total-row { display: flex; justify-content: space-between; padding: 0.2rem 0; font-size: 0.85rem; }
    .total-row.discount { color: var(--orange-500); }
    .total-row.grand { font-size: 1.3rem; font-weight: 700; }

    .cart-actions { display: flex; gap: 0.5rem; padding: 0.75rem 1rem; }
    .pos-pay-btn { font-size: 1.1rem !important; padding: 0.75rem !important; }
    .cart-quick { display: flex; justify-content: center; gap: 0.5rem; padding: 0.5rem; border-top: 1px solid var(--surface-border); }

    .payment-dialog {}
    .payment-total { display: flex; justify-content: space-between; align-items: center; padding: 1rem; background: var(--surface-ground); border-radius: 8px; margin-bottom: 1rem; }
    .payment-amount { font-size: 1.5rem; font-weight: 700; color: var(--primary-color); }
    .payment-methods { display: grid; grid-template-columns: repeat(3, 1fr); gap: 0.5rem; margin-bottom: 1rem; }
    .payment-method-btn {
      display: flex; flex-direction: column; align-items: center; gap: 0.25rem;
      padding: 0.75rem; border-radius: 8px; border: 2px solid var(--surface-border);
      background: var(--surface-card); cursor: pointer; transition: all 0.15s;
      i { font-size: 1.2rem; }
      span { font-size: 0.75rem; }
      &.active { border-color: var(--primary-color); background: var(--primary-50); color: var(--primary-color); }
    }
    .cash-section { display: flex; flex-direction: column; gap: 0.5rem; label { font-weight: 500; } }
    .change-display {
      display: flex; justify-content: space-between; padding: 0.5rem 1rem;
      background: var(--green-50); border-radius: 8px; font-weight: 700; font-size: 1.1rem; color: var(--green-700);
      &.negative { background: var(--red-50); color: var(--red-700); }
    }
    .quick-cash { display: flex; gap: 0.5rem; flex-wrap: wrap; }
    .quick-cash-btn {
      padding: 0.5rem 1rem; border-radius: 6px; border: 1px solid var(--surface-border);
      background: var(--surface-ground); cursor: pointer; font-weight: 600;
    }
  `],
})
export class PosComponent implements OnInit {
  categories = signal<ProductCategory[]>([]);
  products = signal<Product[]>([]);
  selectedCategory = signal<ProductCategory | null>(null);
  searchTerm = '';
  filteredProducts = signal<Product[]>([]);

  cart = signal<CartItem[]>([]);
  orderType = signal<string>('RETAIL');

  orderTypes = [
    { label: 'Магазин', value: 'RETAIL' },
    { label: 'На място', value: 'DINE_IN' },
    { label: 'За вкъщи', value: 'TAKEAWAY' },
    { label: 'Доставка', value: 'DELIVERY' },
  ];

  paymentMethods = [
    { label: 'В брой', value: 'CASH', icon: 'pi pi-money-bill' },
    { label: 'Карта', value: 'CARD', icon: 'pi pi-credit-card' },
    { label: 'Сметка', value: 'ACCOUNT', icon: 'pi pi-wallet' },
    { label: 'Ваучер', value: 'VOUCHER', icon: 'pi pi-ticket' },
    { label: 'Безкасово', value: 'DIGITAL', icon: 'pi pi-globe' },
    { label: 'Смесено', value: 'MIXED', icon: 'pi pi-th-large' },
  ];

  showPaymentDialog = false;
  showDiscountDialog = false;
  showSafeInDialog = false;
  showSafeOutDialog = false;

  selectedPayment = signal<string>('CASH');
  cashReceived = signal(0);
  discountPercent = 0;
  safeAmount = 0;
  safeNotes = '';

  subtotal = computed(() => {
    return this.cart().reduce((sum, item) => {
      const base = item.product.price * item.quantity;
      return sum + base;
    }, 0);
  });

  totalDiscount = computed(() => {
    return this.cart().reduce((sum, item) => {
      const base = item.product.price * item.quantity;
      return sum + (base * item.discount_pct / 100);
    }, 0);
  });

  grandTotal = computed(() => this.subtotal() - this.totalDiscount());

  changeAmount = computed(() => this.cashReceived() - this.grandTotal());

  quickCashAmounts = computed(() => {
    const total = this.grandTotal();
    if (total <= 0) return [];
    const amounts: number[] = [total];
    const roundUp = [5, 10, 20, 50, 100];
    for (const r of roundUp) {
      if (r > total) { amounts.push(r); }
    }
    return [...new Set(amounts)].sort((a, b) => a - b).slice(0, 5);
  });

  canPay = computed(() => {
    if (this.cart().length === 0) return false;
    if (this.selectedPayment() === 'CASH') {
      return this.cashReceived() >= this.grandTotal();
    }
    return true;
  });

  constructor(
    private catalogService: CatalogService,
    private posService: PosService,
    private authService: AuthService,
    private messageService: MessageService,
    private confirmService: ConfirmationService,
    private router: Router,
  ) {}

  currentUser = computed(() => {
    const u = this.authService.user();
    return u ? u.full_name || u.username : 'Касиер';
  });

  ngOnInit(): void {
    this.catalogService.getCategories().subscribe(r => {
      this.categories.set(Array.isArray(r) ? r : (r as any).results || []);
    });
    this.catalogService.getProducts({ is_active: 'true' }).subscribe(r => {
      this.products.set(r.results);
      this.filteredProducts.set(r.results);
    });
  }

  selectCategory(cat: ProductCategory | null): void {
    this.selectedCategory.set(cat);
    this.filterProducts();
  }

  filterProducts(): void {
    let list = this.products();
    const cat = this.selectedCategory();
    if (cat) list = list.filter(p => p.category === cat.id);
    if (this.searchTerm) {
      const term = this.searchTerm.toLowerCase();
      list = list.filter(p =>
        p.name.toLowerCase().includes(term) ||
        (p.barcode && p.barcode.toLowerCase().includes(term))
      );
    }
    this.filteredProducts.set(list);
  }

  addToCart(product: Product): void {
    const current = this.cart();
    const existing = current.findIndex(i => i.product.id === product.id);
    if (existing >= 0) {
      const updated = [...current];
      updated[existing] = {
        ...updated[existing],
        quantity: updated[existing].quantity + 1,
        lineTotal: (updated[existing].quantity + 1) * product.price * (1 - updated[existing].discount_pct / 100),
      };
      this.cart.set(updated);
    } else {
      this.cart.set([...current, {
        product,
        quantity: 1,
        discount_pct: 0,
        notes: '',
        lineTotal: product.price,
      }]);
    }
  }

  changeQty(index: number, delta: number): void {
    const current = [...this.cart()];
    const newQty = current[index].quantity + delta;
    if (newQty <= 0) {
      this.removeFromCart(index);
      return;
    }
    current[index] = {
      ...current[index],
      quantity: newQty,
      lineTotal: newQty * current[index].product.price * (1 - current[index].discount_pct / 100),
    };
    this.cart.set(current);
  }

  removeFromCart(index: number): void {
    const current = [...this.cart()];
    current.splice(index, 1);
    this.cart.set(current);
  }

  clearCart(): void {
    this.confirmService.confirm({
      message: 'Изчистване на поръчката?',
      accept: () => this.cart.set([]),
    });
  }

  applyDiscount(): void {
    const pct = this.discountPercent;
    const updated = this.cart().map(item => ({
      ...item,
      discount_pct: pct,
      lineTotal: item.quantity * item.product.price * (1 - pct / 100),
    }));
    this.cart.set(updated);
    this.showDiscountDialog = false;
    this.msg('info', `Отстъпка ${pct}% приложена.`);
  }

  openPaymentDialog(): void {
    this.cashReceived.set(0);
    this.selectedPayment.set('CASH');
    this.showPaymentDialog = true;
  }

  processPayment(): void {
    const items: CreateOrderItemRequest[] = this.cart().map(c => ({
      product_id: c.product.id,
      quantity: c.quantity,
      discount_pct: c.discount_pct,
      notes: c.notes,
    }));

    const orderUuid = this.generateUuid();

    this.posService.createOrder({
      uuid: orderUuid,
      order_type: this.orderType(),
      items,
    }).subscribe({
      next: (order) => {
        const paymentData: AddPaymentRequest = {
          payment_method: this.selectedPayment(),
          amount: this.grandTotal(),
          change_given: this.selectedPayment() === 'CASH' ? Math.max(0, this.changeAmount()) : 0,
        };
        this.posService.addPayment(order.id, paymentData).subscribe({
          next: () => {
            this.showPaymentDialog = false;
            this.cart.set([]);
            this.msg('success', `Поръчка #${order.order_number} — платена.`);
          },
          error: () => this.msg('error', 'Грешка при плащане.'),
        });
      },
      error: () => this.msg('error', 'Грешка при създаване на поръчка.'),
    });
  }

  executeSafeIn(): void {
    this.posService.safeIn({ amount: this.safeAmount, notes: this.safeNotes }).subscribe({
      next: () => { this.showSafeInDialog = false; this.safeAmount = 0; this.safeNotes = ''; this.msg('success', 'Служебно въвеждане — ОК.'); },
      error: () => this.msg('error', 'Грешка.'),
    });
  }

  executeSafeOut(): void {
    this.posService.safeOut({ amount: this.safeAmount, notes: this.safeNotes }).subscribe({
      next: () => { this.showSafeOutDialog = false; this.safeAmount = 0; this.safeNotes = ''; this.msg('success', 'Служебно извеждане — ОК.'); },
      error: () => this.msg('error', 'Грешка.'),
    });
  }

  goBack(): void {
    this.router.navigate(['/dashboard']);
  }

  private msg(severity: string, detail: string): void {
    this.messageService.add({ severity, summary: severity === 'success' ? 'Успех' : severity === 'error' ? 'Грешка' : 'Инфо', detail, life: 3000 });
  }

  private generateUuid(): string {
    // Simple UUID v4 generator
    return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, c => {
      const r = (Math.random() * 16) | 0;
      const v = c === 'x' ? r : (r & 0x3) | 0x8;
      return v.toString(16);
    });
  }
}
