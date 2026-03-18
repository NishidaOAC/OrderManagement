export interface OrderListItem {
  id: number;
  zoho_invoice_id: string | null;
  invoice_number: string | null;
  customer_name: string | null;
  customer_phone: string | null;
  order_date: string | null;
  current_status: string | null;
  items_count: number;
  deliveries_count: number;
}

export interface OrderItemDetail {
  id: number;
  item_name: string | null;
  ordered_qty: number | null;
  dispatched_qty: number | null;
  returned_qty: number | null;
  item_status: string | null;
}

export interface OrderStatusHistoryDetail {
  id: number;
  status: string | null;
  remarks?: string | null;
  changed_by?: string | null;
  changed_by_user?: {
    id: number;
    full_name: string;
    email: string;
  } | null;
  createdAt: string;
}

export interface DeliveryItemDetail {
  id: number;
  order_item_id: number;
  dispatched_qty: number;
}

export interface DeliveryDetail {
  id: number;
  delivery_note_number: string;
  delivery_date: string;
  delivery_status: string;
  DeliveryItems?: DeliveryItemDetail[];
}

export interface OrderNoteDetail {
  id: number;
  order_id: number;
  note_type: 'CUSTOMER_NOTE' | 'ADDITIONAL_COMMENT';
  note_text: string;
  created_by?: string | null;
  created_by_user?: {
    id: number;
    full_name: string;
    email: string;
  } | null;
  createdAt: string;
}

export interface OrderDetailResponse {
  id: number;
  zoho_invoice_id: string | null;
  invoice_number: string | null;
  customer_name: string | null;
  customer_phone: string | null;
  order_date: string | null;
  warehouse_request?: string | null;
  delivery_channel?: string | null;
  delivery_charge?: number | string | null;
  contacted_customer?: string | null;
  current_status: string | null;
  OrderItems?: OrderItemDetail[];
  OrderStatusHistories?: OrderStatusHistoryDetail[];
  OrderNotes?: OrderNoteDetail[];
  Deliveries?: DeliveryDetail[];
  scheduledDate: string | null;
  installation_required?: boolean;
  installation_charge?: number | string | null;
  installation_by?: string | null;
}

export interface UpdateOrderStatusPayload {
  status: string;
  remarks?: string;
  changed_by?: string;
  warehouse_request?: string;
  delivery_channel?: string;
  delivery_charge?: number;
  contacted_customer?: string;
}

export interface UpdateOrderSchedulePayload {
  order_date: string;
  remarks?: string;
  changed_by?: string;
}

export interface UpdateOrderItemStatusPayload {
  status: string;
  dispatched_qty?: number;
  returned_qty?: number;
  remarks?: string;
  changed_by?: string;
}

export interface CreateDeliveryPayload {
  items: Array<{ item_id: number; dispatched_qty: number }>;
  customer_note?: string;
  comment?: string;
  changed_by?: string;
  warehouse_request?: string;
  delivery_channel?: string;
  delivery_charge?: number;
  contacted_customer?: string;
}

export interface UpdateDeliveryDetailsPayload {
  warehouse_request: string;
  delivery_channel: string;
  delivery_charge: number;
  contacted_customer: string;
  installation_required?: boolean;
  installation_charge?: number;
  installation_by?: string;
}

export interface CreateOrderNotePayload {
  note_type: 'CUSTOMER_NOTE' | 'ADDITIONAL_COMMENT';
  note_text: string;
  created_by?: string;
}

export interface CreateOrderHistoryPayload {
  status: string;
  remarks?: string;
  changed_by?: string;
}
