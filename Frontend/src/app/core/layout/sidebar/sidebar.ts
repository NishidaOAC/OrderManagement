import { Component } from '@angular/core';
import {MatIconModule} from '@angular/material/icon';
import {MatListModule} from '@angular/material/list';
import { Router, RouterLink, RouterLinkActive } from '@angular/router';
import { AuthService } from '../../auth/auth.service';

@Component({
  selector: 'app-sidebar',
  imports: [MatIconModule, MatListModule, RouterLink, RouterLinkActive ],
  templateUrl: './sidebar.html',
  styleUrl: './sidebar.scss',
})
export class Sidebar {
  constructor(
    private readonly authService: AuthService,
    private readonly router: Router
  ) {}

  orders(){
    console.log("Orders clicked");
  }

  isCollapsed = true;
  ordersExpanded = true;

  toggleSidebar() {
    this.isCollapsed = !this.isCollapsed;
  }

  toggleOrders() {
    this.ordersExpanded = !this.ordersExpanded;
  }

  logout() {
    this.authService.logout();
    this.router.navigateByUrl('/login');
  }
}
