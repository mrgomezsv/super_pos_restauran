import { Component, Input, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { BusinessConfiguration, TicketTemplate } from '../../../core/models/business.model';
import { Sale } from '../../../core/models/sale.model';

@Component({
  selector: 'app-receipt',
  standalone: true,
  imports: [CommonModule, MatButtonModule, MatIconModule],
  templateUrl: './receipt.component.html',
  styleUrls: ['./receipt.component.scss']
})
export class ReceiptComponent implements OnInit {
  @Input() sale: Sale | null = null;
  @Input() businessConfig: BusinessConfiguration | null = null;
  @Input() ticketTemplate: TicketTemplate | null = null;

  ngOnInit(): void {
    // Si no hay configuración, usar valores por defecto
    if (!this.businessConfig) {
      this.businessConfig = this.getDefaultConfig();
    }
    if (!this.ticketTemplate) {
      this.ticketTemplate = this.getDefaultTemplate();
    }
  }

  private getDefaultConfig(): BusinessConfiguration {
    return {
      id: 1,
      businessName: 'Super POS',
      commercialName: 'Super POS',
      taxId: '0000-000000-000-0',
      registrationNumber: '000000-0',
      economicActivity: 'Comercio al por menor',
      address: 'Calle Principal, Zona Centro',
      city: 'San Salvador',
      state: 'San Salvador',
      country: 'El Salvador',
      zipCode: '0000',
      phone: '0000-0000',
      email: 'info@superpos.com',
      establishmentName: 'Casa Matriz',
      establishmentCode: '001',
      receiptHeader: 'Gracias por su compra',
      receiptFooter: '¡Vuelva pronto!',
      defaultObservations: '',
      currency: 'USD',
      defaultTaxRate: 15,
      allowNegativeStock: false,
      requireCustomerInfo: false,
      printLogo: false,
      logoPath: '',
      printQRCode: false,
      qrCodeUrl: '',
      createdAt: new Date(),
      updatedAt: new Date()
    };
  }

  private getDefaultTemplate(): TicketTemplate {
    return {
      header: {
        businessName: 'Super POS',
        commercialName: 'Super POS',
        taxId: '0000-000000-000-0',
        address: 'Calle Principal, Zona Centro',
        phone: '0000-0000',
        email: 'info@superpos.com'
      },
      footer: {
        message: '¡Gracias por su compra!',
        observations: '',
        thankYouMessage: '¡Vuelva pronto!'
      },
      receipt: {
        title: 'FACTURA',
        dateLabel: 'FECHA:',
        generationDateLabel: 'FECHA GENERACIÓN:',
        generationCodeLabel: 'CÓDIGO DE GENERACIÓN:',
        receptionSealLabel: 'SELLO DE RECEPCIÓN:',
        controlNumberLabel: 'NÚMERO DE CONTROL:',
        transmissionLabel: 'TRANSMISIÓN:',
        modelLabel: 'MODELO:',
        cashierLabel: 'CAJERO:',
        invoiceNumberLabel: 'FACTURA N°:',
        customerLabel: 'CLIENTE:',
        recipientLabel: 'RECEPTOR:',
        duiLabel: 'DUI:',
        addressLabel: 'DIRECCIÓN:',
        subtotalLabel: 'SUBTOTAL:',
        taxLabel: 'IVA:',
        totalLabel: 'TOTAL:',
        paymentMethodLabel: 'MÉTODO DE PAGO:',
        cashReceivedLabel: 'EFECTIVO RECIBIDO:',
        cashReturnedLabel: 'EFECTIVO DEVUELTO:',
        observationsLabel: 'OBSERVACIONES:'
      }
    };
  }

  formatCurrency(amount: number): string {
    const currency = this.businessConfig?.currency || 'USD';
    return new Intl.NumberFormat('es-SV', {
      style: 'currency',
      currency: currency,
      minimumFractionDigits: 2
    }).format(amount);
  }

  formatDate(date: Date): string {
    return new Intl.DateTimeFormat('es-SV', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit'
    }).format(date);
  }

  getTotalItems(): number {
    if (!this.sale) return 0;
    return this.sale.items.reduce((total, item) => total + item.quantity, 0);
  }

  getPaymentMethodLabel(method: string): string {
    switch (method) {
      case 'cash':
        return 'EFECTIVO';
      case 'card':
        return 'TARJETA';
      case 'transfer':
        return 'TRANSFERENCIA';
      default:
        return method.toUpperCase();
    }
  }

  getCurrentDate(): Date {
    return new Date();
  }

  printReceipt(): void {
    window.print();
  }
}
