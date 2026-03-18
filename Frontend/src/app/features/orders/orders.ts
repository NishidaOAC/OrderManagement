import { ChangeDetectorRef, Component, OnInit, inject } from '@angular/core';
import { RouterLink } from '@angular/router';
import { OrderService } from '../../core/services/order.service';
import { OrderListItem } from '../../core/interfaces/order.interface';
import { NgClass } from '@angular/common';

@Component({
  selector: 'app-orders',
  imports: [RouterLink, NgClass],
  templateUrl: './orders.html',
  styleUrl: './orders.scss',
})
export class Orders implements OnInit {
  private readonly orderService = inject(OrderService);
  private cdr = inject(ChangeDetectorRef);

  loading = false;
  errorMessage = '';
  orders: {
    id: number;
    date: string;
    time: string;
    invoiceNumber: string;
    orderNumber: string;
    customerName: string;
    payMode: string;
    payStatus: string;
    payStatusClass: string;
    orderStatus: string;
    orderStatusClass: string;
    warehouseStatus: string;
    warehouseStatusClass: string;
    scheduledDate: string;
  }[] = [];

  ngOnInit(): void {
    this.fetchOrders();
  }

  private fetchOrders(): void {
    this.loading = true;
    this.errorMessage = '';

    this.orderService.getOrders().subscribe({
      next: (response) => {
        this.orders = (response?.orders || []).map((order: any) =>
          this.mapOrder(order)
        );
        console.log(this.orders);
        
        this.loading = false;
        this.cdr.detectChanges();
      },
      error: (error) => {
        this.errorMessage =
          error?.error?.message || 'Failed to load orders';
        this.loading = false;
        this.cdr.detectChanges();
      },
    });
  }
  private mapOrder(order: OrderListItem) {
    const orderDate = this.formatDate(order.order_date);
    const statusText = this.normalizeStatus(order.current_status);

    return {
      id: order.id,
      date: orderDate.date,
      time: orderDate.time,
      invoiceNumber: order.invoice_number || `INV-${order.id}`,
      orderNumber: order.zoho_invoice_id || `ORD-${order.id}`,
      customerName: order.customer_name || 'Unknown',
      payMode: 'TAPPAY',
      payStatus: 'Pending',
      payStatusClass: 'badge-pending',
      orderStatus: statusText,
      orderStatusClass: this.statusClass(statusText),
      warehouseStatus: order.deliveries_count > 0 ? 'Processed' : 'Pending',
      warehouseStatusClass: order.deliveries_count > 0 ? 'badge-processed' : 'badge-pending',
      scheduledDate: orderDate.date,
    };
  }

  private normalizeStatus(status: string | null): string {
    const normalized = (status || 'NEW ORDER').toUpperCase();
    if (normalized.includes('COMPLETE')) {
      return 'Completed';
    }
    if (normalized.includes('DISPATCH')) {
      return 'Dispatched';
    }
    if (normalized.includes('PROCESS')) {
      return 'Processed';
    }
    if (normalized.includes('DELIVER')) {
      return 'Delivered';
    }
    if (normalized.includes('RECEIVE') || normalized.includes('NEW')) {
      return 'New Order';
    }
    return 'New Order';
  }

  private statusClass(status: string): string {
    if (status === 'Completed') {
      return 'badge-completed';
    }
    if (status === 'Delivered') {
      return 'badge-completed';
    }
    if (status === 'Dispatched') {
      return 'badge-processed';
    }
    if (status === 'Processed') {
      return 'badge-processed';
    }
    return 'badge-new';
  }

  private formatDate(raw: string | null): { date: string; time: string } {
    if (!raw) {
      return { date: '-', time: '-' };
    }

    const date = new Date(raw);
    const dateText = date.toLocaleDateString('en-GB', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
    });
    const timeText = date.toLocaleTimeString('en-US', {
      hour: '2-digit',
      minute: '2-digit',
      hour12: true,
    });

    return {
      date: dateText.replace(/ /g, ' '),
      time: timeText,
    };
  }
}
