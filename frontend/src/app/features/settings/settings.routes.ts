import { Routes } from '@angular/router';
import { roleGuard } from '@core/guards/role.guard';

export const SETTINGS_ROUTES: Routes = [
  {
    path: '',
    loadComponent: () =>
      import('./settings-page/settings-page.component').then(m => m.SettingsPageComponent),
    canActivate: [roleGuard('OWNER', 'MANAGER')],
  },
];
