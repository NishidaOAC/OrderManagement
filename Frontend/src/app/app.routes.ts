import { Routes } from '@angular/router';
import { Layout } from './core/layout/layout';
import { Dashboard } from './features/dashboard/dashboard';
import { Orders } from './features/orders/orders';
import { OrderDetail } from './features/orders/order-detail/order-detail';
import { Login } from './features/login/login';
import { CreateUser } from './features/users/create-user/create-user';
import { Users } from './features/users/users';
import { authGuard, guestGuard } from './core/auth/auth.guard';

export const routes: Routes = [
  { path: 'login', component: Login, canActivate: [guestGuard] },
  {
    path: '',
    component: Layout,
    canActivate: [authGuard],
    children: [
      { path: 'dashboard', component: Dashboard },
      { path: 'orders', component: Orders },
      { path: 'orders/:id', component: OrderDetail, data: { renderMode: 'client' } },
      { path: 'users', component: Users },
      { path: 'users/create', component: CreateUser },
    ],
  },
  { path: '**', redirectTo: 'login' },
];
