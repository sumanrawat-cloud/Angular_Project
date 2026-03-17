// app.routes.ts

import { Routes } from '@angular/router';
import { MainLayoutComponent } from './layout/main-layout/main-layout';
import { AuthGuard } from './core/auth/auth-guard.service';
import { Login } from './pages/login/login';
import { ForgotPassword } from './pages/forgot-password/forgot-password';
export const routes: Routes = [
  {
    path: 'login',
    component: Login,
  },
  {
    path: 'forgot-password',
    component: ForgotPassword,
  },
  {
    path: '',
    component: MainLayoutComponent,
    canActivate: [AuthGuard],
    children: [
      {
        path: 'employee',
        children: [
          // {
          //   path: '',
          //   loadComponent: () =>
          //     import('./features/employee/employee').then(m => m.Employee),
          // },
          {
            path: '',
            loadComponent: () =>
              import('./features/employee/submit-dsr/submit-dsr').then(m => m.SubmitDsr),
          },
          {
            path: 'dsr-detail',
            loadComponent: () =>
              import('./features/employee/dsr-detail/dsr-detail').then(m => m.DsrDetail),
          },
           {
            path: 'my-timesheet',
            loadComponent: () =>
              import('./features/employee/my-timesheet/my-timesheet').then(m => m.MyTimesheet),
          },
        ],
      },
      {
        path: 'manager',
        children: [
          {
            // Manager dashboard — default child route
            path: '',
            loadComponent: () =>
              import('./features/manager/manager').then(m => m.Manager),
          },
          {
            // DSR Review page — navigated to when View button is clicked
            // FIX: This route was missing → Angular fell through to { path: '**', redirectTo: 'login' }
            path: 'dsr-review/:id',
            loadComponent: () =>
              import('./features/manager/dsr-review/dsr-review').then(m => m.DsrReview),
          },
          
        ],
      },
      {
        path: 'super-admin',
        loadComponent: () =>
          import('./features/super-admin/super-admin').then(m => m.SuperAdmin),
      },
      {
        path: '',
        redirectTo: 'employee',
        pathMatch: 'full',
      },
    ],
  },
  {
    path: '**',
    redirectTo: 'login',
  },
];