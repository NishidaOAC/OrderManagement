import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';
import {
  CreateOrderNotePayload,
  CreateOrderHistoryPayload,
  CreateDeliveryPayload,
  OrderDetailResponse,
  OrderListItem,
  UpdateDeliveryDetailsPayload,
  UpdateOrderItemStatusPayload,
  UpdateOrderSchedulePayload,
  UpdateOrderStatusPayload,
} from '../interfaces/order.interface';

@Injectable({ providedIn: 'root' })
export class OrderService {
  private readonly http = inject(HttpClient);
  private readonly apiBase = environment.apiUrl;

  getOrders(): Observable<{ orders: OrderListItem[] }> {
    return this.http.get<{ orders: OrderListItem[] }>(`${this.apiBase}/orders`);
  }

  getOrderById(id: string): Observable<{ order: OrderDetailResponse }> {
    return this.http.get<{ order: OrderDetailResponse }>(`${this.apiBase}/orders/${id}`);
  }

  updateOrderStatus(id: string, payload: UpdateOrderStatusPayload): Observable<any> {
    return this.http.patch(`${this.apiBase}/orders/${id}/status`, payload);
  }

  updateOrderSchedule(id: string, payload: UpdateOrderSchedulePayload): Observable<any> {
    return this.http.patch(`${this.apiBase}/orders/${id}/schedule`, payload);
  }

  updateDeliveryDetails(id: string, payload: UpdateDeliveryDetailsPayload): Observable<any> {
    return this.http.patch(`${this.apiBase}/orders/${id}/delivery-details`, payload);
  }

  updateOrderItemStatus(
    orderId: string,
    itemId: number,
    payload: UpdateOrderItemStatusPayload
  ): Observable<any> {
    return this.http.patch(`${this.apiBase}/orders/${orderId}/items/${itemId}/status`, payload);
  }

  createDelivery(orderId: string, payload: CreateDeliveryPayload): Observable<any> {
    return this.http.post(`${this.apiBase}/orders/${orderId}/deliveries`, payload);
  }

  createOrderNote(orderId: string, payload: CreateOrderNotePayload): Observable<any> {
    return this.http.post(`${this.apiBase}/orders/${orderId}/notes`, payload);
  }

  createOrderHistory(orderId: string, payload: CreateOrderHistoryPayload): Observable<any> {
    return this.http.post(`${this.apiBase}/orders/${orderId}/history`, payload);
  }
}
