import { Component, Input, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { BusinessConfiguration, TicketTemplate } from '../../../core/models/business.model';
import { Sale } from '../../../core/models/sale.model';

@Component({
  selector: 'app-ticket-preview',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './ticket-preview.component.html',
  styleUrls: ['./ticket-preview.component.scss']
})
export class TicketPreviewComponent implements OnInit {
  @Input() businessConfig: BusinessConfiguration | null = null;
  @Input() ticketTemplate: TicketTemplate | null = null;

  // Datos de ejemplo para la vista previa
  sampleSale: Sale = {
    id: 1,
    invoiceNumber: 'CF-241012-A1B',
    customerName: 'Cliente Varios',
    customerDocument: '',
    customerEmail: '',
    invoiceType: 'consumidor_final',
    items: [
      {
        productId: 1,
        productName: 'Coca Cola 350ml',
        quantity: 2,
        unitPrice: 1.25,
        subtotal: 2.50,
        tax: 0.375,
        total: 2.875
      },
      {
        productId: 2,
        productName: 'Pan Integral',
        quantity: 1,
        unitPrice: 2.50,
        subtotal: 2.50,
        tax: 0.375,
        total: 2.875
      }
    ],
    subtotal: 5.00,
    taxAmount: 0.75,
    discountAmount: 0,
    total: 5.75,
    paymentMethod: 'cash',
    paymentAmount: 10.00,
    change: 4.25,
    cashierId: 1,
    cashierName: 'Admin',
    createdAt: new Date(),
    status: 'completed'
  };

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
        cashierLabel: 'CAJERO:',
        invoiceNumberLabel: 'FACTURA N°:',
        customerLabel: 'CLIENTE:'
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
    return this.sampleSale.items.reduce((total, item) => total + item.quantity, 0);
  }
}
