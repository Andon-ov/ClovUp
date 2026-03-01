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
import { ConfirmDialogModule } from 'primeng/confirmdialog';
import { ToastModule } from 'primeng/toast';
import { ToolbarModule } from 'primeng/toolbar';
import { TabViewModule } from 'primeng/tabview';
import { ConfirmationService, MessageService } from 'primeng/api';
import { CatalogService } from '@core/services/catalog.service';
import { Product, ProductCategory } from '@core/models/product.model';

@Component({
  selector: 'app-catalog-list',
  standalone: true,
  imports: [
    CommonModule, FormsModule, TableModule, ButtonModule, InputTextModule,
    DialogModule, DropdownModule, InputNumberModule, TagModule,
    ConfirmDialogModule, ToastModule, ToolbarModule, TabViewModule,
  ],
  providers: [ConfirmationService, MessageService],
  template: `
    <p-toast></p-toast>
    <p-confirmDialog></p-confirmDialog>

    <div class="catalog-page">
      <p-toolbar styleClass="mb-3">
        <ng-template pTemplate="left">
          <h2 class="m-0">Каталог</h2>
        </ng-template>
        <ng-template pTemplate="right">
          <p-button
            *ngIf="activeTab === 0"
            label="Нов продукт"
            icon="pi pi-plus"
            (onClick)="openNew()"
            class="mr-2">
          </p-button>
          <p-button
            *ngIf="activeTab === 1"
            label="Нова категория"
            icon="pi pi-plus"
            (onClick)="openNewCategory()">
          </p-button>
        </ng-template>
      </p-toolbar>

      <p-tabView [(activeIndex)]="activeTab">

        <!-- ─── ТАБ: ПРОДУКТИ ─── -->
        <p-tabPanel header="Продукти">
          <p-table
            [value]="products()"
            [paginator]="true"
            [rows]="20"
            [rowsPerPageOptions]="[10, 20, 50]"
            [globalFilterFields]="['name', 'barcode', 'sku']"
            [loading]="loading()"
            dataKey="id"
            responsiveLayout="scroll"
            styleClass="p-datatable-sm"
          >
            <ng-template pTemplate="caption">
              <div class="flex justify-content-between align-items-center">
                <span class="p-input-icon-left">
                  <i class="pi pi-search"></i>
                  <input
                    pInputText
                    type="text"
                    placeholder="Търсене..."
                    [(ngModel)]="searchTerm"
                    (input)="onSearch()"
                  />
                </span>
                <p-dropdown
                  [options]="categoryOptions()"
                  [(ngModel)]="selectedCategoryId"
                  (onChange)="loadProducts()"
                  placeholder="Всички категории"
                  [showClear]="true"
                  optionLabel="label"
                  optionValue="value"
                  styleClass="w-15rem"
                ></p-dropdown>
              </div>
            </ng-template>

            <ng-template pTemplate="header">
              <tr>
                <th pSortableColumn="name">Име <p-sortIcon field="name"></p-sortIcon></th>
                <th>Баркод</th>
                <th>Категория</th>
                <th pSortableColumn="price">Цена <p-sortIcon field="price"></p-sortIcon></th>
                <th>ДДС</th>
                <th>Статус</th>
                <th style="width: 10rem">Действия</th>
              </tr>
            </ng-template>

            <ng-template pTemplate="body" let-product>
              <tr>
                <td>{{ product.name }}</td>
                <td>{{ product.barcode || '—' }}</td>
                <td>{{ product.category_name || '—' }}</td>
                <td>{{ product.price | number:'1.2-2' }} лв.</td>
                <td>
                  <p-tag [value]="product.vat_group" [severity]="vatSeverity(product.vat_group)"></p-tag>
                </td>
                <td>
                  <p-tag
                    [value]="product.is_active ? 'Активен' : 'Неактивен'"
                    [severity]="product.is_active ? 'success' : 'danger'"
                  ></p-tag>
                </td>
                <td>
                  <p-button icon="pi pi-pencil" [text]="true" (onClick)="editProduct(product)" class="mr-1"></p-button>
                  <p-button icon="pi pi-trash" [text]="true" severity="danger" (onClick)="confirmDelete(product)"></p-button>
                </td>
              </tr>
            </ng-template>

            <ng-template pTemplate="emptymessage">
              <tr><td colspan="7" class="text-center p-4">Няма намерени продукти.</td></tr>
            </ng-template>
          </p-table>
        </p-tabPanel>

        <!-- ─── ТАБ: КАТЕГОРИИ ─── -->
        <p-tabPanel header="Категории">
          <p-table
            [value]="flatCategories()"
            [paginator]="true"
            [rows]="20"
            dataKey="id"
            responsiveLayout="scroll"
            styleClass="p-datatable-sm"
          >
            <ng-template pTemplate="header">
              <tr>
                <th pSortableColumn="name">Име <p-sortIcon field="name"></p-sortIcon></th>
                <th>Родителска категория</th>
                <th style="width: 8rem">Действия</th>
              </tr>
            </ng-template>

            <ng-template pTemplate="body" let-cat>
              <tr>
                <td>{{ cat.name }}</td>
                <td>{{ cat.parent_name || '—' }}</td>
                <td>
                  <p-button icon="pi pi-pencil" [text]="true" (onClick)="editCategory(cat)" class="mr-1"></p-button>
                  <p-button icon="pi pi-trash" [text]="true" severity="danger" (onClick)="confirmDeleteCategory(cat)"></p-button>
                </td>
              </tr>
            </ng-template>

            <ng-template pTemplate="emptymessage">
              <tr><td colspan="3" class="text-center p-4">Няма категории.</td></tr>
            </ng-template>
          </p-table>
        </p-tabPanel>

      </p-tabView>
    </div>

    <!-- ─── ДИАЛОГ: ПРОДУКТ ─── -->
    <p-dialog
      [(visible)]="dialogVisible"
      [header]="editMode ? 'Редактиране на продукт' : 'Нов продукт'"
      [modal]="true"
      [style]="{ width: '500px' }"
      styleClass="p-fluid"
    >
      <div class="flex flex-column gap-3 pt-3">
        <div class="field">
          <label for="name">Име *</label>
          <input pInputText id="name" [(ngModel)]="form.name" required autofocus />
        </div>
        <div class="flex gap-3">
          <div class="field flex-1">
            <label for="barcode">Баркод</label>
            <input pInputText id="barcode" [(ngModel)]="form.barcode" />
          </div>
          <div class="field flex-1">
            <label for="sku">SKU</label>
            <input pInputText id="sku" [(ngModel)]="form.sku" />
          </div>
        </div>
        <div class="flex gap-3">
          <div class="field flex-1">
            <label for="price">Цена *</label>
            <p-inputNumber id="price" [(ngModel)]="form.price" mode="decimal" [minFractionDigits]="2" [maxFractionDigits]="2"></p-inputNumber>
          </div>
          <div class="field flex-1">
            <label for="cost_price">Себестойност</label>
            <p-inputNumber id="cost_price" [(ngModel)]="form.cost_price" mode="decimal" [minFractionDigits]="2" [maxFractionDigits]="2"></p-inputNumber>
          </div>
        </div>
        <div class="flex gap-3">
          <div class="field flex-1">
            <label for="category">Категория</label>
            <p-dropdown
              id="category"
              [options]="categoryOptions()"
              [(ngModel)]="form.category"
              placeholder="Без категория"
              [showClear]="true"
              optionLabel="label"
              optionValue="value"
            ></p-dropdown>
          </div>
          <div class="field flex-1">
            <label for="vat_group">ДДС група</label>
            <p-dropdown
              id="vat_group"
              [options]="vatGroupOptions"
              [(ngModel)]="form.vat_group"
              optionLabel="label"
              optionValue="value"
            ></p-dropdown>
          </div>
        </div>
        <div class="flex gap-3">
          <div class="field flex-1">
            <label for="unit">Мерна единица</label>
            <p-dropdown
              id="unit"
              [options]="unitOptions"
              [(ngModel)]="form.unit"
              optionLabel="label"
              optionValue="value"
            ></p-dropdown>
          </div>
          <div class="field flex-1">
            <label for="max_discount">Макс. отстъпка %</label>
            <p-inputNumber id="max_discount" [(ngModel)]="form.max_discount_pct" [min]="0" [max]="100" suffix="%"></p-inputNumber>
          </div>
        </div>
      </div>

      <ng-template pTemplate="footer">
        <p-button label="Откажи" icon="pi pi-times" [text]="true" (onClick)="dialogVisible = false"></p-button>
        <p-button label="Запиши" icon="pi pi-check" (onClick)="saveProduct()"></p-button>
      </ng-template>
    </p-dialog>

    <!-- ─── ДИАЛОГ: КАТЕГОРИЯ ─── -->
    <p-dialog
      [(visible)]="categoryDialogVisible"
      [header]="categoryEditMode ? 'Редактиране на категория' : 'Нова категория'"
      [modal]="true"
      [style]="{ width: '400px' }"
      styleClass="p-fluid"
    >
      <div class="flex flex-column gap-3 pt-3">
        <div class="field">
          <label for="cat-name">Име *</label>
          <input pInputText id="cat-name" [(ngModel)]="categoryForm.name" required autofocus />
        </div>
        <div class="field">
          <label for="cat-parent">Родителска категория</label>
          <p-dropdown
            id="cat-parent"
            [options]="categoryOptions()"
            [(ngModel)]="categoryForm.parent"
            placeholder="Няма (главна категория)"
            [showClear]="true"
            optionLabel="label"
            optionValue="value"
          ></p-dropdown>
        </div>
      </div>

      <ng-template pTemplate="footer">
        <p-button label="Откажи" icon="pi pi-times" [text]="true" (onClick)="categoryDialogVisible = false"></p-button>
        <p-button label="Запиши" icon="pi pi-check" (onClick)="saveCategory()"></p-button>
      </ng-template>
    </p-dialog>
  `,
  styles: [`
    .catalog-page { h2 { margin: 0; font-weight: 600; } }
  `],
})
export class CatalogListComponent implements OnInit {
  products = signal<Product[]>([]);
  categories = signal<ProductCategory[]>([]);
  flatCategories = signal<any[]>([]);
  loading = signal(false);

  // Products dialog
  dialogVisible = false;
  editMode = false;
  form: any = {};

  // Categories dialog
  categoryDialogVisible = false;
  categoryEditMode = false;
  categoryForm: any = {};

  activeTab = 0;
  searchTerm = '';
  selectedCategoryId: number | null = null;

  vatGroupOptions = [
    { label: 'А — 0%', value: 'А' },
    { label: 'Б — 20%', value: 'Б' },
    { label: 'В — 20% (горива)', value: 'В' },
    { label: 'Г — 9%', value: 'Г' },
  ];

  unitOptions = [
    { label: 'Бройки', value: 'PCS' },
    { label: 'Килограми', value: 'KG' },
    { label: 'Литри', value: 'L' },
    { label: 'Метри', value: 'M' },
  ];

  categoryOptions = signal<{ label: string; value: number }[]>([]);

  constructor(
    private catalogService: CatalogService,
    private confirmationService: ConfirmationService,
    private messageService: MessageService,
  ) {}

  ngOnInit(): void {
    this.loadProducts();
    this.loadCategories();
  }

  loadProducts(): void {
    this.loading.set(true);
    const params: Record<string, string> = {};
    if (this.searchTerm) params['search'] = this.searchTerm;
    if (this.selectedCategoryId) params['category'] = this.selectedCategoryId.toString();

    this.catalogService.getProducts(params).subscribe({
      next: (res) => {
        this.products.set(res.results);
        this.loading.set(false);
      },
      error: () => this.loading.set(false),
    });
  }

  loadCategories(): void {
    this.catalogService.getCategories().subscribe({
      next: (cats) => {
        this.categories.set(cats);
        const flat = this.flattenCategories(cats);
        this.categoryOptions.set(flat.map(c => ({ label: c.name, value: c.id })));
        this.flatCategories.set(flat);
      },
    });
  }

  private flattenCategories(items: ProductCategory[], parentName: string | null = null): any[] {
    const result: any[] = [];
    for (const c of items) {
      result.push({ ...c, parent_name: parentName });
      if (c.children?.length) result.push(...this.flattenCategories(c.children, c.name));
    }
    return result;
  }

  onSearch(): void {
    this.loadProducts();
  }

  // ─── Products ───

  openNew(): void {
    this.form = { name: '', barcode: '', sku: '', price: 0, cost_price: null, category: null, vat_group: 'Б', unit: 'PCS', max_discount_pct: 0 };
    this.editMode = false;
    this.dialogVisible = true;
  }

  editProduct(product: Product): void {
    this.form = { ...product };
    this.editMode = true;
    this.dialogVisible = true;
  }

  saveProduct(): void {
    if (!this.form.name) {
      this.messageService.add({ severity: 'warn', summary: 'Внимание', detail: 'Моля, въведете име.' });
      return;
    }

    const obs = this.editMode
      ? this.catalogService.updateProduct(this.form.id, this.form)
      : this.catalogService.createProduct(this.form);

    obs.subscribe({
      next: () => {
        this.messageService.add({
          severity: 'success',
          summary: 'Успех',
          detail: this.editMode ? 'Продуктът е обновен.' : 'Продуктът е създаден.',
        });
        this.dialogVisible = false;
        this.loadProducts();
      },
      error: () => {
        this.messageService.add({ severity: 'error', summary: 'Грешка', detail: 'Неуспешна операция.' });
      },
    });
  }

  confirmDelete(product: Product): void {
    this.confirmationService.confirm({
      message: `Сигурни ли сте, че искате да изтриете "${product.name}"?`,
      header: 'Потвърждение',
      icon: 'pi pi-exclamation-triangle',
      acceptLabel: 'Да',
      rejectLabel: 'Не',
      accept: () => {
        this.catalogService.deleteProduct(product.id).subscribe({
          next: () => {
            this.messageService.add({ severity: 'success', summary: 'Изтрит', detail: 'Продуктът е изтрит.' });
            this.loadProducts();
          },
        });
      },
    });
  }

  // ─── Categories ───

  openNewCategory(): void {
    this.categoryForm = { name: '', parent: null };
    this.categoryEditMode = false;
    this.categoryDialogVisible = true;
  }

  editCategory(cat: any): void {
    this.categoryForm = { id: cat.id, name: cat.name, parent: cat.parent ?? null };
    this.categoryEditMode = true;
    this.categoryDialogVisible = true;
  }

  saveCategory(): void {
    if (!this.categoryForm.name) {
      this.messageService.add({ severity: 'warn', summary: 'Внимание', detail: 'Моля, въведете име на категорията.' });
      return;
    }

    const payload = { name: this.categoryForm.name, parent: this.categoryForm.parent ?? null };
    const obs = this.categoryEditMode
      ? this.catalogService.updateCategory(this.categoryForm.id, payload)
      : this.catalogService.createCategory(payload);

    obs.subscribe({
      next: () => {
        this.messageService.add({
          severity: 'success',
          summary: 'Успех',
          detail: this.categoryEditMode ? 'Категорията е обновена.' : 'Категорията е създадена.',
        });
        this.categoryDialogVisible = false;
        this.loadCategories();
      },
      error: () => {
        this.messageService.add({ severity: 'error', summary: 'Грешка', detail: 'Неуспешна операция.' });
      },
    });
  }

  confirmDeleteCategory(cat: any): void {
    this.confirmationService.confirm({
      message: `Сигурни ли сте, че искате да изтриете категория "${cat.name}"?`,
      header: 'Потвърждение',
      icon: 'pi pi-exclamation-triangle',
      acceptLabel: 'Да',
      rejectLabel: 'Не',
      accept: () => {
        this.catalogService.deleteCategory(cat.id).subscribe({
          next: () => {
            this.messageService.add({ severity: 'success', summary: 'Изтрита', detail: 'Категорията е изтрита.' });
            this.loadCategories();
          },
          error: () => {
            this.messageService.add({ severity: 'error', summary: 'Грешка', detail: 'Неуспешно изтриване.' });
          },
        });
      },
    });
  }

  vatSeverity(group: string): 'success' | 'info' | 'warning' | 'danger' {
    switch (group) {
      case 'А': return 'info';
      case 'Б': return 'success';
      case 'В': return 'warning';
      case 'Г': return 'danger';
      default: return 'info';
    }
  }
}
