import { Routes } from '@angular/router';
import { authGuard } from '../../core/guards/auth.guard';

export const POS_ROUTES: Routes = [
  {
    path: '',
    loadComponent: () =>
      import('./pos.component').then(m => m.PosComponent),
    canActivate: [authGuard],
  },
];
