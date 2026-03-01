import { Component, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { CardModule } from 'primeng/card';
import { ChartModule } from 'primeng/chart';
import { TableModule } from 'primeng/table';
import { ButtonModule } from 'primeng/button';
import { CalendarModule } from 'primeng/calendar';
import { TabViewModule } from 'primeng/tabview';
import { TagModule } from 'primeng/tag';
import { ToolbarModule } from 'primeng/toolbar';
import {
  ReportsService,
  SalesByDate,
  SalesByHour,
  TopProduct,
  VatBreakdown,
  PaymentBreakdown,
} from '@core/services/reports.service';
import { DailyZReport } from '@core/models/order.model';

@Component({
  selector: 'app-reports-dashboard',
  standalone: true,
  imports: [
    CommonModule, FormsModule, CardModule, ChartModule, TableModule,
    ButtonModule, CalendarModule, TabViewModule, TagModule, ToolbarModule,
  ],
  template: `
    <div class="reports-page">
      <p-toolbar styleClass="mb-3">
        <ng-template pTemplate="left">
          <h2 class="m-0">Отчети</h2>
        </ng-template>
        <ng-template pTemplate="right">
          <div class="flex gap-2 align-items-center">
            <p-calendar [(ngModel)]="dateFrom" (onSelect)="reload()" dateFormat="yy-mm-dd" placeholder="От" [showIcon]="true" styleClass="w-10rem"></p-calendar>
            <p-calendar [(ngModel)]="dateTo" (onSelect)="reload()" dateFormat="yy-mm-dd" placeholder="До" [showIcon]="true" styleClass="w-10rem"></p-calendar>
            <p-button label="CSV" icon="pi pi-download" severity="secondary" [text]="true" (onClick)="exportCsv()"></p-button>
            <p-button label="Excel" icon="pi pi-file-excel" severity="success" [text]="true" (onClick)="exportExcel()"></p-button>
          </div>
        </ng-template>
      </p-toolbar>

      <p-tabView>
        <!-- Sales chart -->
        <p-tabPanel header="Продажби">
          <div class="grid">
            <div class="col-12">
              <p-card header="Продажби по дни">
                <p-chart type="bar" [data]="salesChartData()" [options]="chartOptions" height="350px"></p-chart>
              </p-card>
            </div>
            <div class="col-12 md:col-6">
              <p-card header="Почасово разпределение">
                <p-chart type="line" [data]="hourlyChartData()" [options]="chartOptions" height="300px"></p-chart>
              </p-card>
            </div>
            <div class="col-12 md:col-6">
              <p-card header="Топ продукти">
                <p-table [value]="topProducts()" styleClass="p-datatable-sm">
                  <ng-template pTemplate="header">
                    <tr><th>Продукт</th><th>Брой</th><th>Приход</th></tr>
                  </ng-template>
                  <ng-template pTemplate="body" let-p>
                    <tr>
                      <td>{{ p.product_name }}</td>
                      <td>{{ p.total_qty | number:'1.0-0' }}</td>
                      <td>{{ p.total_revenue | number:'1.2-2' }} лв.</td>
                    </tr>
                  </ng-template>
                </p-table>
              </p-card>
            </div>
          </div>
        </p-tabPanel>

        <!-- VAT -->
        <p-tabPanel header="ДДС справка">
          <p-table [value]="vatData()" styleClass="p-datatable-sm">
            <ng-template pTemplate="header">
              <tr><th>ДДС група</th><th>Оборот</th><th>Бр. позиции</th></tr>
            </ng-template>
            <ng-template pTemplate="body" let-v>
              <tr>
                <td><p-tag [value]="v.vat_group"></p-tag></td>
                <td>{{ v.total_amount | number:'1.2-2' }} лв.</td>
                <td>{{ v.total_items }}</td>
              </tr>
            </ng-template>
          </p-table>
        </p-tabPanel>

        <!-- Payments -->
        <p-tabPanel header="Плащания">
          <div class="grid">
            <div class="col-12 md:col-6">
              <p-chart type="doughnut" [data]="paymentChartData()" height="350px"></p-chart>
            </div>
            <div class="col-12 md:col-6">
              <p-table [value]="paymentData()" styleClass="p-datatable-sm">
                <ng-template pTemplate="header">
                  <tr><th>Метод</th><th>Сума</th><th>Бр.</th></tr>
                </ng-template>
                <ng-template pTemplate="body" let-p>
                  <tr>
                    <td>{{ paymentLabel(p.payment_method) }}</td>
                    <td>{{ p.total | number:'1.2-2' }} лв.</td>
                    <td>{{ p.count }}</td>
                  </tr>
                </ng-template>
              </p-table>
            </div>
          </div>
        </p-tabPanel>

        <!-- Z-Reports -->
        <p-tabPanel header="Z-Отчети">
          <p-table [value]="zReports()" [paginator]="true" [rows]="10" styleClass="p-datatable-sm">
            <ng-template pTemplate="header">
              <tr><th>Дата</th><th>Обект</th><th>Очаквано</th><th>Фискално</th><th>Разлика</th><th>Статус</th></tr>
            </ng-template>
            <ng-template pTemplate="body" let-z>
              <tr>
                <td>{{ z.date }}</td>
                <td>{{ z.location__name }}</td>
                <td>{{ z.expected_total | number:'1.2-2' }} лв.</td>
                <td>{{ z.fiscal_total | number:'1.2-2' }} лв.</td>
                <td [class]="z.difference === 0 ? '' : 'text-red-500'">{{ z.difference | number:'1.2-2' }} лв.</td>
                <td>
                  <p-tag [value]="zStatusLabel(z.status)" [severity]="zStatusSeverity(z.status)"></p-tag>
                </td>
              </tr>
            </ng-template>
            <ng-template pTemplate="emptymessage">
              <tr><td colspan="6" class="text-center p-4">Няма Z-отчети.</td></tr>
            </ng-template>
          </p-table>
        </p-tabPanel>
      </p-tabView>
    </div>
  `,
  styles: [`.reports-page { h2 { margin: 0; font-weight: 600; } }`],
})
export class ReportsDashboardComponent implements OnInit {
  dateFrom: Date | null = null;
  dateTo: Date | null = null;

  salesData = signal<SalesByDate[]>([]);
  hourlyData = signal<SalesByHour[]>([]);
  topProducts = signal<TopProduct[]>([]);
  vatData = signal<VatBreakdown[]>([]);
  paymentData = signal<PaymentBreakdown[]>([]);
  zReports = signal<DailyZReport[]>([]);

  chartOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: { legend: { display: false } },
  };

  salesChartData = signal<any>({ labels: [], datasets: [] });
  hourlyChartData = signal<any>({ labels: [], datasets: [] });
  paymentChartData = signal<any>({ labels: [], datasets: [] });

  constructor(private reportsService: ReportsService) {}

  ngOnInit(): void {
    this.reload();
  }

  reload(): void {
    const params = this.buildParams();

    this.reportsService.getSalesByDate(params).subscribe(data => {
      this.salesData.set(data);
      this.salesChartData.set({
        labels: data.map(d => d.date),
        datasets: [{
          label: 'Приходи',
          data: data.map(d => d.revenue),
          backgroundColor: '#3B82F6',
        }],
      });
    });

    this.reportsService.getSalesByHour(params).subscribe(data => {
      this.hourlyData.set(data);
      this.hourlyChartData.set({
        labels: data.map(d => new Date(d.hour).getHours() + ':00'),
        datasets: [{
          label: 'Приходи',
          data: data.map(d => d.revenue),
          borderColor: '#10B981',
          fill: true,
          backgroundColor: 'rgba(16,185,129,0.1)',
          tension: 0.3,
        }],
      });
    });

    this.reportsService.getTopProducts(params).subscribe(data => this.topProducts.set(data));
    this.reportsService.getVatBreakdown(params).subscribe(data => this.vatData.set(data));

    this.reportsService.getPaymentBreakdown(params).subscribe(data => {
      this.paymentData.set(data);
      const colors = ['#3B82F6', '#10B981', '#F59E0B', '#EF4444', '#8B5CF6', '#EC4899', '#6366F1', '#14B8A6'];
      this.paymentChartData.set({
        labels: data.map(d => this.paymentLabel(d.payment_method)),
        datasets: [{
          data: data.map(d => d.total),
          backgroundColor: colors.slice(0, data.length),
        }],
      });
    });

    this.reportsService.getZReportHistory(params).subscribe(data => this.zReports.set(data));
  }

  exportCsv(): void { this.reportsService.exportCsv(this.buildParams()); }
  exportExcel(): void { this.reportsService.exportExcel(this.buildParams()); }

  paymentLabel(method: string): string {
    const map: Record<string, string> = {
      CASH: 'В брой', CARD: 'Карта', CHEQUE: 'Чек', VOUCHER: 'Ваучер',
      COUPON: 'Купон', DIGITAL: 'Безкасово', ACCOUNT: 'Сметка', MIXED: 'Смесено',
    };
    return map[method] || method;
  }

  zStatusLabel(s: string): string {
    switch (s) { case 'BALANCED': return 'Балансиран'; case 'SHORT': return 'Недостиг'; case 'OVER': return 'Излишък'; default: return s; }
  }

  zStatusSeverity(s: string): 'success' | 'warning' | 'danger' {
    switch (s) { case 'BALANCED': return 'success'; case 'SHORT': return 'danger'; case 'OVER': return 'warning'; default: return 'warning'; }
  }

  private buildParams(): Record<string, string> {
    const p: Record<string, string> = {};
    if (this.dateFrom) p['date_from'] = this.dateFrom.toISOString().slice(0, 10);
    if (this.dateTo) p['date_to'] = this.dateTo.toISOString().slice(0, 10);
    return p;
  }
}
