import { Injectable } from '@angular/core';
import { ToastrService } from 'ngx-toastr';

export interface NotificationConfig {
  type: 'success' | 'error' | 'warning' | 'info';
  title?: string;
  message: string;
  duration?: number;
  position?: 'top-right' | 'top-left' | 'bottom-right' | 'bottom-left' | 'top-center' | 'bottom-center';
  showCloseButton?: boolean;
  enableHtml?: boolean;
}

@Injectable({
  providedIn: 'root'
})
export class NotificationService {
  constructor(private toastr: ToastrService) {
    this.configureToastr();
  }

  private configureToastr(): void {
    this.toastr.toastrConfig.positionClass = 'toast-top-right';
    this.toastr.toastrConfig.timeOut = 4000;
    this.toastr.toastrConfig.extendedTimeOut = 2000;
    this.toastr.toastrConfig.closeButton = true;
    this.toastr.toastrConfig.progressBar = true;
    this.toastr.toastrConfig.enableHtml = true;
  }

  show(config: NotificationConfig): void {
    const options = {
      timeOut: config.duration || 4000,
      closeButton: config.showCloseButton !== false,
      progressBar: true,
      enableHtml: config.enableHtml || false,
      positionClass: `toast-${config.position || 'top-right'}`
    };

    switch (config.type) {
      case 'success':
        this.toastr.success(config.message, config.title, options);
        break;
      case 'error':
        this.toastr.error(config.message, config.title, options);
        break;
      case 'warning':
        this.toastr.warning(config.message, config.title, options);
        break;
      case 'info':
        this.toastr.info(config.message, config.title, options);
        break;
    }
  }

  // Métodos de conveniencia
  success(message: string, title?: string): void {
    this.show({ type: 'success', message, title });
  }

  error(message: string, title?: string): void {
    this.show({ type: 'error', message, title });
  }

  warning(message: string, title?: string): void {
    this.show({ type: 'warning', message, title });
  }

  info(message: string, title?: string): void {
    this.show({ type: 'info', message, title });
  }

  // Notificaciones específicas del POS
  productAdded(productName: string): void {
    this.success(`<i class="material-icons" style="font-size: 16px; vertical-align: middle;">check_circle</i> ${productName} agregado al carrito`);
  }

  productOutOfStock(productName: string): void {
    this.warning(`<i class="material-icons" style="font-size: 16px; vertical-align: middle;">warning</i> ${productName} sin stock disponible`);
  }

  insufficientStock(productName: string): void {
    this.warning(`<i class="material-icons" style="font-size: 16px; vertical-align: middle;">warning</i> Stock insuficiente para ${productName}`);
  }

  cartCleared(): void {
    this.info('<i class="material-icons" style="font-size: 16px; vertical-align: middle;">shopping_cart</i> Carrito limpiado');
  }

  saleCompleted(amount: number): void {
    this.success(`<i class="material-icons" style="font-size: 16px; vertical-align: middle;">payment</i> Venta completada por $${amount.toFixed(2)}`);
  }

  paymentError(): void {
    this.error('<i class="material-icons" style="font-size: 16px; vertical-align: middle;">error</i> Error al procesar el pago');
  }

  barcodeNotFound(barcode: string): void {
    this.warning(`<i class="material-icons" style="font-size: 16px; vertical-align: middle;">qr_code_scanner</i> Código de barras ${barcode} no encontrado`);
  }
}
