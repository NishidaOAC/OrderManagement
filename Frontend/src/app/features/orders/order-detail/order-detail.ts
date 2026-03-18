import { ChangeDetectorRef, Component, OnInit, inject } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { OrderService } from '../../../core/services/order.service';
import { OrderDetailResponse } from '../../../core/interfaces/order.interface';
import { AuthService } from '../../../core/auth/auth.service';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';

@Component({
  selector: 'app-order-detail',
  imports: [ReactiveFormsModule],
  templateUrl: './order-detail.html',
  styleUrl: './order-detail.scss',
})
export class OrderDetail implements OnInit {
  private readonly route = inject(ActivatedRoute);
  private readonly orderService = inject(OrderService);
  private readonly authService = inject(AuthService);
  private readonly cdr = inject(ChangeDetectorRef);
  private readonly fb = inject(FormBuilder);

  loading = false;
  errorMessage = '';
  statusMessage = '';
  statusErrorMessage = '';
  private orderId = '';

  processingProceed = false;
  creatingDelivery = false;

  customerNote = '';
  additionalComment = '';
  customerNotes: { text: string; by: string; at: string }[] = [];
  additionalComments: { text: string; by: string; at: string }[] = [];
  savingCustomerNote = false;
  savingAdditionalComment = false;
  scheduledDateInput = '';
  deadlineDateInput = '';
  savingScheduledDate = false;

  orderSummary = {
    invoice: '-',
    orderNo: '-',
    orderDate: '-',
    paymentMethod: 'TAPPAY',
    paymentStatus: 'Pending',
    totalAmount: '-',
    contactedCustomer: 'Yes',
     deliveryChannel: 'UFC TEAM',
     deliveryCharge: '0',
     warehouseRequest: 'Request Sent',
  };

  shippingAddress = {
    name: '-',
    line1: '-',
    line2: '-',
    city: '-',
    email: '-',
    phone: '-',
  };

  showDeliveryPanel = false;
  isProceedDone = false;
  isOrderReceivedStage = false;
  currentOrderStage = 'RECEIVED';
  warehouseRequestOptions = ['Request Sent', 'Request Not Sent'];
  deliveryChannelOptions = ['UFC Team', 'Courier', 'Warehouse Pickup'];
  contactedCustomerOptions = ['Yes', 'No'];
  notifyCustomer = true;
  savingDeliveryDetails = false;
  pendingDeliveryDetailsSave = false;

  deliveryDetailsForm: FormGroup = this.fb.group({
    warehouseRequest: ['Request Sent', Validators.required],
    deliveryChannel: ['UFC Team', Validators.required],
    deliveryCharge: [0, [Validators.required, Validators.min(0)]],
    contactedCustomer: ['Yes', Validators.required],
    installationRequired: [false],
    installationCharge: [0, [Validators.min(0)]],
    installationBy: [''],
  });

  steps = [
    { label: 'Order Received', date: '', state: '' },
    { label: 'Processed', date: '', state: '' },
    { label: 'Dispatched', date: '', state: '' },
    { label: 'Delivered', date: '', state: '' },
    { label: 'Completed', date: '', state: '' },
  ];

  products: {
    id: number;
    checked: boolean;
    name: string;
    retailPrice: number;
    discount: number;
    salePrice: number;
    subTotal: number;
    orderedQty: number;
    dispatchedQty: number;
    returnedQty: number;
    itemStatus: string;
  }[] = [];

  history: { key: string; sequence: number; by: string; at: string; message: string; iconClass: string }[] = [];
  deliveredRows: { noteNumber: string; date: string; status: string; itemCount: number; qty: number }[] = [];
  private readonly hiddenHistoryStatuses = new Set([
    'CUSTOMER_NOTE_SAVED',
    'ADDITIONAL_COMMENT_SAVED',
  ]);


  ngOnInit(): void {
    this.route.paramMap.subscribe((params) => {
      const id = params.get('id');
      if (!id) {
        this.errorMessage = 'Order id is missing in route.';
        return;
      }
      this.orderId = id;
      this.fetchOrder(id);
    });
  }

  get hasSelectedProducts(): boolean {
    return this.products.some((item) => item.checked);
  }

  get canPrintAndDeliver(): boolean {
    return this.isProceedDone && this.showDeliveryPanel;
  }

  get isDeliveryDetailsEditable(): boolean {
    return this.currentOrderStage === 'PROCESSED';
  }

  get deliveryActionLabel(): string {
    if (this.currentOrderStage === 'DELIVERED') {
      return 'Completed';
    }
    if (this.currentOrderStage === 'DISPATCHED') {
      return 'Mark as Delivery';
    }
    return 'Proceed';
  }

  isStepDone(index: number): boolean {
    return this.steps[index]?.state === 'done';
  }

  isStepCurrent(index: number): boolean {
    return this.steps[index]?.state === 'current';
  }

  isStepNext(index: number): boolean {
    return this.steps[index]?.state === 'upcoming';
  }

  isStepPending(index: number): boolean {
    return this.steps[index]?.state === 'pending';
  }

  isConnectorDone(index: number): boolean {
    const currentStepIndex = this.getCurrentStepIndex();
    return index < currentStepIndex;
  }

  isConnectorMixed(index: number): boolean {
    const currentStepIndex = this.getCurrentStepIndex();
    return index === currentStepIndex && currentStepIndex < this.steps.length - 1;
  }

  isConnectorPending(index: number): boolean {
    const currentStepIndex = this.getCurrentStepIndex();
    return index > currentStepIndex;
  }

  private getCurrentStepIndex(): number {
    const currentStepIndex = this.steps.findIndex((step) => step.state === 'current');
    if (currentStepIndex >= 0) {
      return currentStepIndex;
    }

    const doneCount = this.steps.filter((step) => step.state === 'done').length;
    return Math.max(Math.min(doneCount - 1, this.steps.length - 1), 0);
  }

  onProductSelectionChange(index: number, event: Event): void {
    const input = event.target as HTMLInputElement | null;
    if (!input) {
      return;
    }

    this.products[index].checked = input.checked;
  }


  // No longer needed: onWarehouseRequestChange, onDeliveryChannelChange, onDeliveryChargeChange, onDeliveryChargeCommit, onContactedCustomerChange


  private saveDeliveryDetailsFromForm(): void {
    if (!this.orderId) {
      return;
    }
    if (this.savingDeliveryDetails) {
      this.pendingDeliveryDetailsSave = true;
      return;
    }
    this.savingDeliveryDetails = true;
    this.pendingDeliveryDetailsSave = false;
    const formValue = this.deliveryDetailsForm.value;
    this.orderService.updateDeliveryDetails(this.orderId, {
      warehouse_request: formValue.warehouseRequest,
      delivery_channel: formValue.deliveryChannel,
      delivery_charge: formValue.deliveryCharge,
      contacted_customer: formValue.contactedCustomer,
      installation_required: formValue.installationRequired,
      installation_charge: formValue.installationCharge,
      installation_by: formValue.installationBy,
    }).subscribe({
      next: () => {
        this.savingDeliveryDetails = false;
        if (this.pendingDeliveryDetailsSave) {
          this.saveDeliveryDetailsFromForm();
        }
      },
      error: (error) => {
        this.statusErrorMessage = error?.error?.message || 'Failed to save delivery details';
        this.savingDeliveryDetails = false;
        if (this.pendingDeliveryDetailsSave) {
          this.saveDeliveryDetailsFromForm();
          return;
        }
        this.cdr.detectChanges();
      },
    });
  }

  onCustomerNoteChange(event: Event): void {
    const input = event.target as HTMLTextAreaElement | null;
    if (!input) {
      return;
    }
    this.customerNote = input.value;
  }

  onScheduledDateChange(event: Event): void {
    const input = event.target as HTMLInputElement | null;
    if (!input) {
      return;
    }

    this.scheduledDateInput = input.value;
  }

  saveScheduledDate(): void {
    const nextDate = this.scheduledDateInput.trim();
    if (!nextDate || !this.orderId || this.savingScheduledDate) {
      return;
    }

    this.savingScheduledDate = true;
    this.statusMessage = '';
    this.statusErrorMessage = '';

    this.orderService.updateOrderSchedule(this.orderId, {
      order_date: nextDate,
      remarks: this.composeRemarks(`Scheduled date updated to ${nextDate}`),
      changed_by: this.authService.getUserId() || 'System',
    }).subscribe({
      next: () => {
        this.savingScheduledDate = false;
        this.statusMessage = 'Scheduled date saved successfully.';
        this.fetchOrder(this.orderId);
      },
      error: (error) => {
        this.statusErrorMessage = error?.error?.message || 'Failed to save scheduled date';
        this.savingScheduledDate = false;
        this.cdr.detectChanges();
      },
    });
  }

  saveCustomerNote(): void {
    const text = this.customerNote.trim();
    if (!text || !this.orderId || this.savingCustomerNote) {
      return;
    }
    this.savingCustomerNote = true;
    this.orderService.createOrderNote(this.orderId, {
      note_type: 'CUSTOMER_NOTE',
      note_text: text,
      created_by: this.authService.getUserId() || 'System',
    }).subscribe({
      next: (res) => {
        this.customerNote = '';
        this.savingCustomerNote = false;
        this.fetchOrder(this.orderId);
      },
      error: (error) => {
        this.statusErrorMessage = error?.error?.message || 'Failed to save customer note';
        this.savingCustomerNote = false;
        this.cdr.detectChanges();
      },
    });
  }

  onAdditionalCommentChange(event: Event): void {
    const input = event.target as HTMLTextAreaElement | null;
    if (!input) {
      return;
    }
    this.additionalComment = input.value;
  }

  saveAdditionalComment(): void {
    const text = this.additionalComment.trim();
    if (!text || !this.orderId || this.savingAdditionalComment) {
      return;
    }
    this.savingAdditionalComment = true;
    this.orderService.createOrderNote(this.orderId, {
      note_type: 'ADDITIONAL_COMMENT',
      note_text: text,
      created_by: this.authService.getUserId() || 'System',
    }).subscribe({
      next: () => {
        this.additionalComment = '';
        this.savingAdditionalComment = false;
        this.fetchOrder(this.orderId);
      },
      error: (error) => {
        this.statusErrorMessage = error?.error?.message || 'Failed to save additional comment';
        this.savingAdditionalComment = false;
        this.cdr.detectChanges();
      },
    });
  }

  onItemDispatchedQtyChange(index: number, event: Event): void {
    const input = event.target as HTMLInputElement | null;
    if (!input) {
      return;
    }
    const nextValue = Number(input.value);
    const orderedQty = Math.max(Number(this.products[index].orderedQty || 0), 1);
    const normalized = Number.isNaN(nextValue) ? 1 : Math.min(Math.max(nextValue, 1), orderedQty);
    this.products[index].dispatchedQty = normalized;
    input.value = String(normalized);
  }

  onItemDispatchedQtyCommit(index: number, event: Event): void {
    const input = event.target as HTMLInputElement | null;
    if (!input || !this.orderId) {
      return;
    }

    const item = this.products[index];
    if (!item) {
      return;
    }

    this.orderService.createOrderHistory(this.orderId, {
      status: 'QTY_EDITED',
      remarks: `Qty updated for item ${item.name} to ${item.dispatchedQty}`
    }).subscribe({ error: () => void 0 });
  }

  onProceedClick(): void {
    if (!this.hasSelectedProducts || !this.orderId || this.processingProceed || this.isProceedDone) {
      return;
    }
    // Save delivery details first
    this.saveDeliveryDetailsFromForm();
    // Then proceed as before
    this.processingProceed = true;
    this.statusMessage = '';
    this.statusErrorMessage = '';
    this.orderService
      .updateOrderStatus(this.orderId, {
        status: 'PROCESSED',
        remarks: this.composeRemarks('Status changed to PROCESSED'),
        changed_by: this.authService.getUserId() || 'System',
      })
      .subscribe({
        next: () => {
          this.isProceedDone = true;
          this.showDeliveryPanel = true;
          const selectedItems = this.products.filter((item) => item.checked);
          if (selectedItems.length === 0) {
            this.processingProceed = false;
            this.fetchOrder(this.orderId);
            return;
          }
          let pending = selectedItems.length;
          for (const selectedItem of selectedItems) {
            const qtyToProcess = selectedItem.dispatchedQty > 0 ? selectedItem.dispatchedQty : selectedItem.orderedQty;
            this.orderService
              .updateOrderItemStatus(this.orderId, selectedItem.id, {
                status: 'PROCESSED',
                dispatched_qty: qtyToProcess,
                returned_qty: selectedItem.returnedQty,
                remarks: this.composeRemarks(`Item ${selectedItem.name} processed`),
                changed_by: this.authService.getUserId() || 'System',
              })
              .subscribe({
                next: () => {
                  pending -= 1;
                  if (pending === 0) {
                    this.processingProceed = false;
                    this.statusMessage = 'Order moved to PROCESSED. Print and Delivery actions are now enabled.';
                    this.fetchOrder(this.orderId);
                  }
                },
                error: (error) => {
                  pending -= 1;
                  this.statusErrorMessage =
                    error?.error?.message || 'One or more selected items could not be marked as processed';
                  if (pending === 0) {
                    this.processingProceed = false;
                    this.fetchOrder(this.orderId);
                  }
                },
              });
          }
        },
        error: (error) => {
          this.statusErrorMessage = error?.error?.message || 'Failed to move order to processed';
          this.processingProceed = false;
          this.cdr.detectChanges();
        },
      });
  }

  onDeliverClick(): void {
    if (this.isDeliveryDetailsEditable) {
      this.persistDeliveryDetailsAndContinue(() => this.executeDeliverFlow());
      return;
    }

    this.executeDeliverFlow();
  }

  private persistDeliveryDetailsAndContinue(onSaved: () => void): void {
    if (!this.orderId) {
      this.statusErrorMessage = 'Order id is missing.';
      this.cdr.detectChanges();
      return;
    }

    this.savingDeliveryDetails = true;
    this.pendingDeliveryDetailsSave = false;
    const formValue = this.deliveryDetailsForm.value;
    this.orderService.updateDeliveryDetails(this.orderId, {
      warehouse_request: formValue.warehouseRequest,
      delivery_channel: formValue.deliveryChannel,
      delivery_charge: formValue.deliveryCharge,
      contacted_customer: formValue.contactedCustomer,
      installation_required: formValue.installationRequired,
      installation_charge: formValue.installationCharge,
      installation_by: formValue.installationBy,
    }).subscribe({
      next: () => {
        this.savingDeliveryDetails = false;
        onSaved();
      },
      error: (error) => {
        this.statusErrorMessage = error?.error?.message || 'Failed to save delivery details';
        this.savingDeliveryDetails = false;
        this.cdr.detectChanges();
      },
    });
  }

  private executeDeliverFlow(): void {
    if (!this.orderId) {
      this.statusErrorMessage = 'Order id is missing.';
      this.cdr.detectChanges();
      return;
    }

    if (this.currentOrderStage === 'DELIVERED') {
      if (this.creatingDelivery) {
        return;
      }
      this.creatingDelivery = true;
      this.statusMessage = '';
      this.statusErrorMessage = '';

      // Save installation fields before completing
      const formValue = this.deliveryDetailsForm.value;
      this.orderService.updateDeliveryDetails(this.orderId, {
        warehouse_request: formValue.warehouseRequest,
        delivery_channel: formValue.deliveryChannel,
        delivery_charge: formValue.deliveryCharge,
        contacted_customer: formValue.contactedCustomer,
        installation_charge: formValue.installationCharge,
        installation_by: formValue.installationBy,
      }).subscribe({
        next: () => {
          // Now mark as completed
          this.orderService
            .updateOrderStatus(this.orderId, {
              status: 'COMPLETED',
              remarks: this.composeRemarks('Status changed to COMPLETED'),
              changed_by: this.authService.getUserId() || 'System',
            })
            .subscribe({
              next: () => {
                this.statusMessage = 'Order moved to COMPLETED.';
                this.creatingDelivery = false;
                this.fetchOrder(this.orderId);
              },
              error: (error) => {
                this.statusErrorMessage = error?.error?.message || 'Failed to set order to COMPLETED';
                this.creatingDelivery = false;
                this.cdr.detectChanges();
              },
            });
        },
        error: (error) => {
          this.statusErrorMessage = error?.error?.message || 'Failed to save installation details';
          this.creatingDelivery = false;
          this.cdr.detectChanges();
        },
      });
      return;
    }

    if (!this.hasSelectedProducts) {
      this.statusErrorMessage = 'Select at least one item for delivery.';
      this.cdr.detectChanges();
      return;
    }

    if (!this.isProceedDone) {
      this.statusErrorMessage = 'Click Proceed first to move order to PROCESSED.';
      this.cdr.detectChanges();
      return;
    }

    if (this.creatingDelivery) {
      return;
    }

    this.creatingDelivery = true;
    this.statusMessage = '';
    this.statusErrorMessage = '';

    if (this.currentOrderStage === 'DISPATCHED') {
      const selectedItems = this.products.filter((item) => item.checked && item.itemStatus !== 'DELIVERED');
      if (selectedItems.length === 0) {
        this.statusErrorMessage = 'Selected items are already delivered.';
        this.creatingDelivery = false;
        this.cdr.detectChanges();
        return;
      }

      this.orderService
        .createDelivery(this.orderId, {
          items: selectedItems.map((item) => ({
            item_id: item.id,
            dispatched_qty: Math.min(
              Math.max(item.dispatchedQty > 0 ? item.dispatchedQty : 1, 1),
              Math.max(Number(item.orderedQty || 0), 1)
            ),
          })),
          customer_note: this.customerNote.trim() || undefined,
          comment: this.composeDeliveryComment(),
          changed_by: this.authService.getUserId() || 'System',
        })
        .subscribe({
          next: () => {
            this.statusMessage = 'Delivery created and selected items marked as delivered.';
            this.creatingDelivery = false;
            this.fetchOrder(this.orderId);
          },
          error: (error) => {
            this.statusErrorMessage =
              error?.error?.message ||
              (error?.status === 404
                ? 'Delivery API not found. Restart backend and verify /api/orders/:id/deliveries route.'
                : 'Failed to create delivery');
            this.creatingDelivery = false;
            this.cdr.detectChanges();
          },
        });
      return;
    }

    const selectedItems = this.products.filter(
      (item) => item.checked && item.itemStatus !== 'DELIVERED' && item.itemStatus !== 'DISPATCHED'
    );
    if (selectedItems.length === 0) {
      this.statusErrorMessage = 'Selected items are already dispatched or delivered.';
      this.creatingDelivery = false;
      this.cdr.detectChanges();
      return;
    }

    this.orderService
      .updateOrderStatus(this.orderId, {
        status: 'DISPATCHED',
        remarks: this.composeRemarks('Status changed to DISPATCHED'),
        changed_by: this.authService.getUserId() || 'System',
      })
      .subscribe({
        next: () => {
          let pending = selectedItems.length;
          for (const item of selectedItems) {
            this.orderService
              .updateOrderItemStatus(this.orderId, item.id, {
                status: 'DISPATCHED',
                dispatched_qty: Math.min(
                  Math.max(item.dispatchedQty > 0 ? item.dispatchedQty : 1, 1),
                  Math.max(Number(item.orderedQty || 0), 1)
                ),
                returned_qty: Number(item.returnedQty || 0),
                remarks: this.composeRemarks(`Item ${item.name} dispatched`),
                changed_by: this.authService.getUserId() || 'System',
              })
              .subscribe({
                next: (res) => {
                  pending -= 1;
                  if (pending === 0) {
                    this.statusMessage = 'Order moved to DISPATCHED.';
                    this.creatingDelivery = false;
                    this.fetchOrder(this.orderId);
                  }
                },
                error: (error) => {
                  pending -= 1;
                  this.statusErrorMessage =
                    error?.error?.message || 'Failed to set one or more items to DISPATCHED';
                  if (pending === 0) {
                    this.creatingDelivery = false;
                    this.cdr.detectChanges();
                  }
                },
              });
          }
        },
        error: (error) => {
          this.statusErrorMessage = error?.error?.message || 'Failed to set order to DISPATCHED';
          this.creatingDelivery = false;
          this.cdr.detectChanges();
        },
      });
  }

  private composeRemarks(actionText: string): string {
    const parts = [actionText];
    const userName = this.authService.getUserName();
    if (userName) {
      parts.push(`User Name: ${userName}`);
    }
    const userId = this.authService.getUserId();
    if (userId) {
      parts.push(`User ID: ${userId}`);
    }
    if (this.customerNote.trim()) {
      parts.push(`Customer Note: ${this.customerNote.trim()}`);
    }
    if (this.additionalComment.trim()) {
      parts.push(`Comment: ${this.additionalComment.trim()}`);
    }
    return parts.join(' | ');
  }

  private composeDeliveryComment(): string | undefined {
    const parts: string[] = [];
    const userName = this.authService.getUserName();
    if (userName) {
      parts.push(`User Name: ${userName}`);
    }
    const userId = this.authService.getUserId();
    if (userId) {
      parts.push(`User ID: ${userId}`);
    }
    if (this.additionalComment.trim()) {
      parts.push(this.additionalComment.trim());
    }
    return parts.length ? parts.join(' | ') : undefined;
  }

  orders: any[] = [];
  private fetchOrder(id: string): void {
    this.loading = true;
    this.errorMessage = '';

    this.orderService.getOrderById(id).subscribe({

      next: ({ order }) => {
        console.log(order);
        this.applyOrder(order);
        this.loading = false;
        this.cdr.detectChanges();
      },
      error: (error) => {
        this.errorMessage = error?.error?.message || 'Failed to load order details';
        this.loading = false;
        this.cdr.detectChanges();
      },
    });
  }

  private applyOrder(order: OrderDetailResponse): void {
    console.log(order);
    this.orders = [order]; // For debugging, to see the raw order data in the template if needed
    this.orderSummary = {
      invoice: order.invoice_number || '-',
      orderNo: order.zoho_invoice_id || String(order.id),
      orderDate: this.formatDate(order.order_date),
      paymentMethod: 'TAPPAY',
      paymentStatus: 'Pending',
      totalAmount: '-',
      deliveryChannel: order.delivery_channel || 'UFC TEAM',
      deliveryCharge : order.delivery_charge !== undefined ? String(order.delivery_charge) : '0',
      contactedCustomer: order.contacted_customer || 'Yes',
      warehouseRequest: order.warehouse_request || 'Request Sent',
    };
    console.log(this.orderSummary);
    
    this.scheduledDateInput = this.formatDateForInput(order.order_date);
    this.deadlineDateInput = this.formatDateForInput(order.order_date);

    this.shippingAddress = {
      name: order.customer_name || '-',
      line1: '-',
      line2: '-',
      city: '-',
      email: '-',
      phone: order.customer_phone || '-',
    };

    this.steps = this.buildSteps(order.current_status, order.order_date, order.OrderStatusHistories || []);

    const orderStatus = String(order.current_status || 'RECEIVED').toUpperCase();
    this.currentOrderStage = this.normalizeStage(orderStatus);
    this.isOrderReceivedStage = this.currentOrderStage === 'RECEIVED';
    this.isProceedDone = ['PROCESSED', 'DISPATCHED', 'DELIVERED', 'COMPLETED'].includes(this.currentOrderStage);
    this.showDeliveryPanel = this.isProceedDone;

    // Patch delivery details form with latest values
    this.deliveryDetailsForm.patchValue({
      warehouseRequest: order.warehouse_request || 'Request Sent',
      deliveryChannel: order.delivery_channel || 'UFC Team',
      deliveryCharge: Number(order.delivery_charge ?? 40),
      contactedCustomer: order.contacted_customer || 'Yes',
      installationRequired: !!order.installation_required,
      installationCharge: Number(order.installation_charge ?? 0),
      installationBy: order.installation_by || '',
    });

    this.products = (order.OrderItems || []).map((item) => {
      const qty = Number(item.ordered_qty || 0);
      const sale = qty;
      const itemStatus = (item.item_status || 'PENDING').toUpperCase();

      return {
        id: item.id,
        checked: itemStatus !== 'DELIVERED',
        name: item.item_name || 'Item',
        retailPrice: qty,
        discount: 0,
        salePrice: sale,
        subTotal: sale,
        orderedQty: qty,
        dispatchedQty: Number(item.dispatched_qty || qty),
        returnedQty: Number(item.returned_qty || 0),
        itemStatus,
      };
    });

    this.deliveredRows = (order.Deliveries || []).map((delivery) => {
      const deliveryItems = delivery.DeliveryItems || [];
      const qty = deliveryItems.reduce((sum, item) => sum + Number(item.dispatched_qty || 0), 0);

      return {
        noteNumber: delivery.delivery_note_number,
        date: this.formatDate(delivery.delivery_date),
        status: delivery.delivery_status,
        itemCount: deliveryItems.length,
        qty,
      };
    });
    const visibleHistory = (order.OrderStatusHistories || []).filter(
      (item) => {
        const normalizedStatus = String(item.status || '').toUpperCase();
        return !this.hiddenHistoryStatuses.has(normalizedStatus) && !normalizedStatus.startsWith('ITEM_');
      }
    );

    this.history = visibleHistory.map((item, index, items) => ({
      key: `${item.status || 'UNKNOWN'}-${item.createdAt}-${index}`,
      sequence: items.length - index,
      by:
        item.changed_by_user?.full_name ||
        item.changed_by ||
        this.extractUserNameFromRemarks(item.remarks) ||
        'System',
      at: this.formatDateTime(item.createdAt),
      message: item.status ? `${item.status} - Status changed to ${item.status}` : `Status changed to ${item.status || 'Unknown'}`,
      iconClass: index % 2 === 0 ? 'icon-note' : 'icon-edit',
    }));

    const sortedOrderNotes = [...(order.OrderNotes || [])].sort(
      (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
    );

    this.customerNotes = sortedOrderNotes
      .filter((item) => item.note_type === 'CUSTOMER_NOTE')
      .map((item) => ({
        text: item.note_text,
        by: item.created_by_user?.full_name || item.created_by || 'System',
        at: this.formatDateTime(item.createdAt),
      }));

    this.additionalComments = sortedOrderNotes
      .filter((item) => item.note_type === 'ADDITIONAL_COMMENT')
      .map((item) => ({
        text: item.note_text,
        by: item.created_by_user?.full_name || item.created_by || 'System',
        at: this.formatDateTime(item.createdAt),
      }));
  }

  private extractUserNameFromRemarks(remarks?: string | null): string | null {
    if (!remarks) {
      return null;
    }
    const match = remarks.match(/User Name:\s*([^|]+)/i);
    if (!match?.[1]) {
      return null;
    }
    return match[1].trim();
  }

  private extractUserIdFromRemarks(remarks?: string | null): string | null {
    if (!remarks) {
      return null;
    }
    const match = remarks.match(/User ID:\s*([^|]+)/i);
    if (!match?.[1]) {
      return null;
    }
    return match[1].trim();
  }


  private buildSteps(
    status: string | null,
    orderDate: string | null,
    histories: Array<{ status: string | null; createdAt: string }>
  ) {
    const stages = ['RECEIVED', 'PROCESSED', 'DISPATCHED', 'DELIVERED', 'COMPLETED'];
    const labels = ['Order Received', 'Processed', 'Dispatched', 'Delivered', 'Completed'];
    const normalizedStatus = this.normalizeStage(status);
    const currentStage = Math.max(stages.indexOf(normalizedStatus), 0);
    const stageDates = this.collectStageDates(histories);
    stageDates['RECEIVED'] = stageDates['RECEIVED'] || this.formatDate(orderDate);

    return labels.map((label, index) => ({
      label,
      date: stageDates[stages[index] as keyof typeof stageDates] || '',
      state:
        index < currentStage ? 'done' : index === currentStage ? 'current' : index === currentStage + 1 ? 'upcoming' : 'pending',
    }));
  }

  private collectStageDates(histories: Array<{ status: string | null; createdAt: string }>) {
    const dates: Record<string, string> = {
      RECEIVED: '',
      PROCESSED: '',
      DISPATCHED: '',
      DELIVERED: '',
      COMPLETED: '',
    };

    for (const history of histories) {
      if (String(history.status || '').toUpperCase().startsWith('ITEM_')) {
        continue;
      }
      const stage = this.normalizeStage(history.status);
      if (!dates[stage]) {
        dates[stage] = this.formatDate(history.createdAt);
      }
    }

    return dates;
  }

  private normalizeStage(rawStatus: string | null): string {
    const status = String(rawStatus || 'RECEIVED').toUpperCase();

    if (status === 'RECEIVED' || status === 'PROCESSED' || status === 'DISPATCHED' || status === 'DELIVERED' || status === 'COMPLETED') {
      return status;
    }
    if (status.includes('DELIVER')) {
      return 'DELIVERED';
    }
    if (status.includes('COMPLETE')) {
      return 'COMPLETED';
    }
    if (status.includes('DISPATCH')) {
      return 'DISPATCHED';
    }
    if (status.includes('PROCESS')) {
      return 'PROCESSED';
    }
    return 'RECEIVED';
  }

  private formatDate(raw: string | null): string {
    if (!raw) {
      return '-';
    }
    return new Date(raw).toLocaleDateString('en-GB', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
    });
  }

  private formatDateForInput(raw: string | null): string {
    if (!raw) {
      return '';
    }

    const date = new Date(raw);
    if (Number.isNaN(date.getTime())) {
      return '';
    }

    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  }

  private formatDateTime(raw: string | null): string {
    if (!raw) {
      return '-';
    }
    const date = new Date(raw);
    const d = date.toLocaleDateString('en-GB', {
      day: '2-digit',
      month: '2-digit',
      year: '2-digit',
    });
    const t = date.toLocaleTimeString('en-GB', {
      hour: '2-digit',
      minute: '2-digit',
      hour12: false,
    });
    return `${d} ${t}`;
  }

  printDeliveryNote(): void {
    const selectedProducts = this.products.filter((item) => item.checked);
    const productsToPrint = selectedProducts.length ? selectedProducts : this.products;

    this.statusMessage = '';
    this.statusErrorMessage = '';
    this.executePrint(productsToPrint);
    if (this.orderId) {
      this.orderService.createOrderHistory(this.orderId, {
        status: 'DELIVERY_NOTE_PRINTED',
        remarks: `Printed delivery note for ${productsToPrint.length} item(s)`,
        changed_by: this.authService.getUserId() || 'System',
      }).subscribe({ error: () => void 0 });
    }
    this.statusMessage = 'Delivery note printed.';
  }

  private executePrint(
    productsToPrint: Array<{
      id: number;
      checked: boolean;
      name: string;
      retailPrice: number;
      discount: number;
      salePrice: number;
      subTotal: number;
      orderedQty: number;
      dispatchedQty: number;
      returnedQty: number;
      itemStatus: string;
    }>
  ): void {

    const productRows = productsToPrint
      .map(
        (item, index) => `
          <tr>
            <td>${index + 1}</td>
            <td>
              <div class="item-cell">
                <div class="thumb"></div>
                <div>
                  <div class="name">${this.escapeHtml(item.name)}</div>
                  <div class="sku">NTEX24125-INT</div>
                </div>
              </div>
            </td>
            <td>${item.dispatchedQty || item.orderedQty}</td>
            <td><span class="serial-line"></span></td>
          </tr>
        `
      )
      .join('');

    const printMarkup = `
      <style>
        * { box-sizing: border-box; }
        body { font-family: Arial, sans-serif; margin: 0; background: #fff; color: #1d1d1d; }
        .page { width: 794px; min-height: 1123px; margin: 0 auto; border: 1px solid #111; padding: 26px 34px 28px; }
        .top { display: flex; justify-content: space-between; align-items: flex-start; }
        .logo { font-size: 20px; color: #1772e7; line-height: 1; font-weight: 700; }
        .brand { font-size: 42px; font-weight: 800; line-height: 0.85; margin-left: 8px; }
        .brand-wrap { display: flex; align-items: flex-start; }
        .title { text-align: right; }
        .title h1 { margin: 0; font-size: 32px; font-weight: 700; letter-spacing: 0.2px; }
        .title .inv { font-size: 20px; font-weight: 700; margin-top: 2px; }
        .balance { margin-top: 40px; font-size: 12px; line-height: 1.35; color: #444; }
        .balance strong { font-size: 22px; color: #111; }
        .company { margin-top: 10px; line-height: 1.35; font-size: 12px; color: #4d4d4d; }
        .company .name { font-weight: 700; font-size: 18px; color: #121212; margin-bottom: 4px; }
        .bill-grid { display: flex; justify-content: space-between; margin-top: 26px; align-items: flex-end; }
        .bill-left { font-size: 12px; color: #535353; max-width: 62%; line-height: 1.35; }
        .bill-left .strong { font-weight: 700; color: #111; }
        .meta { text-align: right; font-size: 12px; color: #555; line-height: 1.5; }
        .product-table { width: 100%; border-collapse: collapse; margin-top: 26px; }
        .product-table thead th {
          background: #3f423f; color: #fff; font-size: 12px; font-weight: 600;
          text-align: left; padding: 10px 14px;
        }
        .product-table td { padding: 10px 14px; border-bottom: 1px solid #d8d8d8; font-size: 12px; vertical-align: middle; }
        .item-cell { display: flex; gap: 10px; align-items: center; }
        .thumb { width: 42px; height: 42px; background: #c59add; }
        .name { font-size: 12px; line-height: 1.25; font-weight: 600; }
        .sku { font-size: 11px; color: #4f4f4f; margin-top: 2px; }
        .serial-line { display: inline-block; width: 88px; border-bottom: 1px solid #999; height: 1px; vertical-align: middle; }
        .footer { margin-top: 28px; font-size: 12px; color: #555; }
        .line { display: inline-block; min-width: 122px; border-bottom: 1px solid #888; margin-left: 8px; transform: translateY(-3px); }
        @media print {
          @page { size: A4 portrait; margin: 0; }
          body { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
        }
      </style>
      <div class="page">
        <div class="top">
          <div class="brand-wrap">
            <div class="logo">UFC</div>
            <div class="brand">URBAN<br/>FITNESS<br/>CART</div>
          </div>
          <div class="title">
            <h1>DELIVERY NOTE</h1>
            <div class="inv"># ${this.escapeHtml(this.orderSummary.invoice)}</div>
            <div class="balance">Balance Due:<br/><strong>AED0.00</strong></div>
          </div>
        </div>

        <div class="company">
          <div class="name">URBAN FITNESS CART SPORT EQUIPMENT TRADING L.L.C</div>
          G-12<br/>
          Al Garhoud, Dubai, United Arab Emirates<br/>
          +971 50 900 1650<br/>
          sales@urbanfitnesscart.com<br/>
          www.urbanfitnesscart.com<br/>
          TRN: 100546022300003
        </div>

        <div class="bill-grid">
          <div class="bill-left">
            Bill To:<br/>
            <span class="strong">${this.escapeHtml(this.shippingAddress.name)}</span><br/>
            Mobile: ${this.escapeHtml(this.shippingAddress.phone)}
          </div>
          <div class="meta">
            Date : ${this.escapeHtml(this.formatDate(new Date().toISOString()))}<br/>
            Reference#: ${this.escapeHtml(this.orderSummary.orderNo)}
          </div>
        </div>

        <table class="product-table">
          <thead>
            <tr>
              <th style="width: 50px;">#</th>
              <th>Item & Description</th>
              <th style="width: 90px;">Qty</th>
              <th style="width: 120px;">Serial Number</th>
            </tr>
          </thead>
          <tbody>
            ${productRows}
          </tbody>
        </table>

        <div class="footer">
          Authorized Signature:<span class="line"></span><br/><br/>
          Date:<span class="line"></span>
        </div>
      </div>
    `;

    const printHost = document.createElement('div');
    printHost.id = 'delivery-note-print-host';
    printHost.innerHTML = printMarkup;

    const printVisibilityStyle = document.createElement('style');
    printVisibilityStyle.id = 'delivery-note-print-visibility';
    printVisibilityStyle.textContent = `
      @media print {
        body * { visibility: hidden !important; }
        #delivery-note-print-host,
        #delivery-note-print-host * { visibility: visible !important; }
        #delivery-note-print-host {
          position: fixed;
          inset: 0;
          z-index: 999999;
          background: #fff;
          overflow: auto;
        }
      }
    `;

    document.body.appendChild(printVisibilityStyle);
    document.body.appendChild(printHost);

    const cleanup = () => {
      const host = document.getElementById('delivery-note-print-host');
      const style = document.getElementById('delivery-note-print-visibility');
      host?.remove();
      style?.remove();
      window.removeEventListener('afterprint', cleanup);
    };

    window.addEventListener('afterprint', cleanup, { once: true });
    window.print();
    setTimeout(cleanup, 1200);
  }

  private escapeHtml(value: string): string {
    return value
      .replaceAll('&', '&amp;')
      .replaceAll('<', '&lt;')
      .replaceAll('>', '&gt;')
      .replaceAll('"', '&quot;')
      .replaceAll("'", '&#39;');
  }
}
