import { Component, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { CardModule } from 'primeng/card';
import { ChartModule } from 'primeng/chart';
import { TableModule } from 'primeng/table';
import {
  ReportsService,
  DashboardKPIs,
  SalesByDate,
  SalesByHour,
  TopProduct,
} from '@core/services/reports.service';

@Component({
  selector: 'app-dashboard',
  standalone: true,
  imports: [CommonModule, CardModule, ChartModule, TableModule],
  template: `
    <div class="dashboard">
      <h2>Табло</h2>

      <!-- KPI cards -->
      <div class="kpi-grid mb-4">
        <p-card styleClass="kpi-card">
          <div class="kpi">
            <div class="kpi-icon revenue"><i class="pi pi-dollar"></i></div>
            <div class="kpi-content">
              <span class="kpi-label">Приходи днес</span>
              <span class="kpi-value">{{ kpis().total_revenue | number:'1.2-2' }} лв.</span>
            </div>
          </div>
        </p-card>

        <p-card styleClass="kpi-card">
          <div class="kpi">
            <div class="kpi-icon orders"><i class="pi pi-shopping-cart"></i></div>
            <div class="kpi-content">
              <span class="kpi-label">Поръчки</span>
              <span class="kpi-value">{{ kpis().order_count }}</span>
            </div>
          </div>
        </p-card>

        <p-card styleClass="kpi-card">
          <div class="kpi">
            <div class="kpi-icon avg"><i class="pi pi-receipt"></i></div>
            <div class="kpi-content">
              <span class="kpi-label">Среден бон</span>
              <span class="kpi-value">{{ kpis().avg_ticket | number:'1.2-2' }} лв.</span>
            </div>
          </div>
        </p-card>

        <p-card styleClass="kpi-card">
          <div class="kpi">
            <div class="kpi-icon category"><i class="pi pi-tag"></i></div>
            <div class="kpi-content">
              <span class="kpi-label">Топ категория</span>
              <span class="kpi-value">{{ kpis().top_category || '—' }}</span>
            </div>
          </div>
        </p-card>
      </div>

      <!-- Charts row -->
      <div class="grid">
        <div class="col-12 md:col-8">
          <p-card header="Продажби (последни 7 дни)">
            <p-chart type="line" [data]="salesChartData()" [options]="lineOptions" height="300px"></p-chart>
          </p-card>
        </div>
        <div class="col-12 md:col-4">
          <p-card header="Почасово разпределение">
            <p-chart type="bar" [data]="hourlyChartData()" [options]="barOptions" height="300px"></p-chart>
          </p-card>
        </div>
      </div>

      <!-- Top products -->
      <div class="mt-3">
        <p-card header="Топ 10 продукти">
          <p-table [value]="topProducts()" styleClass="p-datatable-sm p-datatable-striped">
            <ng-template pTemplate="header">
              <tr><th>#</th><th>Продукт</th><th class="text-right">Продадено</th><th class="text-right">Приход</th></tr>
            </ng-template>
            <ng-template pTemplate="body" let-p let-i="rowIndex">
              <tr>
                <td>{{ i + 1 }}</td>
                <td>{{ p.product_name }}</td>
                <td class="text-right">{{ p.total_qty | number:'1.0-0' }}</td>
                <td class="text-right">{{ p.total_revenue | number:'1.2-2' }} лв.</td>
              </tr>
            </ng-template>
            <ng-template pTemplate="emptymessage">
              <tr><td colspan="4" class="text-center p-4">Няма данни.</td></tr>
            </ng-template>
          </p-table>
        </p-card>
      </div>
    </div>
  `,
  styles: [`
    .dashboard {
      h2 { margin: 0 0 1.5rem; font-weight: 600; }
    }
    .kpi-grid {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(240px, 1fr));
      gap: 1rem;
    }
    .kpi { display: flex; align-items: center; gap: 1rem; }
    .kpi-icon {
      width: 48px; height: 48px; border-radius: 12px;
      display: flex; align-items: center; justify-content: center; font-size: 1.25rem;
      &.revenue  { background: #dbeafe; color: #2563eb; }
      &.orders   { background: #dcfce7; color: #16a34a; }
      &.avg      { background: #fef3c7; color: #d97706; }
      &.category { background: #f3e8ff; color: #9333ea; }
    }
    .kpi-content { display: flex; flex-direction: column; }
    .kpi-label { font-size: 0.8rem; color: var(--text-color-secondary); text-transform: uppercase; letter-spacing: 0.03em; }
    .kpi-value { font-size: 1.4rem; font-weight: 700; color: var(--text-color); }
  `],
})
export class DashboardComponent implements OnInit {
  kpis = signal<DashboardKPIs>({
    total_revenue: 0, order_count: 0, avg_ticket: 0, top_category: null, top_category_revenue: 0,
  });

  salesChartData = signal<any>({ labels: [], datasets: [] });
  hourlyChartData = signal<any>({ labels: [], datasets: [] });
  topProducts = signal<TopProduct[]>([]);

  lineOptions = {
    responsive: true, maintainAspectRatio: false,
    plugins: { legend: { display: false } },
    scales: { y: { beginAtZero: true } },
  };

  barOptions = {
    responsive: true, maintainAspectRatio: false,
    plugins: { legend: { display: false } },
    scales: { y: { beginAtZero: true } },
  };

  constructor(private reportsService: ReportsService) {}

  ngOnInit(): void {
    this.reportsService.getDashboardKPIs().subscribe({
      next: (data) => this.kpis.set(data),
      error: (err) => console.error('Failed to load KPIs', err),
    });

    this.reportsService.getSalesByDate({}).subscribe(data => {
      this.salesChartData.set({
        labels: data.map(d => d.date),
        datasets: [{
          label: 'Приходи', data: data.map(d => d.revenue),
          borderColor: '#3B82F6', backgroundColor: 'rgba(59,130,246,0.1)',
          fill: true, tension: 0.3,
        }],
      });
    });

    this.reportsService.getSalesByHour({}).subscribe(data => {
      this.hourlyChartData.set({
        labels: data.map(d => new Date(d.hour).getHours() + ':00'),
        datasets: [{
          label: 'Продажби', data: data.map(d => d.revenue),
          backgroundColor: '#10B981',
        }],
      });
    });

    this.reportsService.getTopProducts({}).subscribe(data => this.topProducts.set(data));
  }
}
