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
    // Debug: Log de datos recibidos
    console.log('Receipt Component - Sale data:', this.sale);
    console.log('Receipt Component - Sale items:', this.sale?.items);
    console.log('Receipt Component - Business Config:', this.businessConfig);
    console.log('Receipt Component - Ticket Template:', this.ticketTemplate);
    
    // Si no hay configuración, usar valores por defecto
    if (!this.businessConfig) {
      this.businessConfig = this.getDefaultConfig();
      console.log('Using default business config');
    }
    if (!this.ticketTemplate) {
      this.ticketTemplate = this.getDefaultTemplate();
      console.log('Using default ticket template');
    }
    
    // Si no hay venta o no tiene items, usar datos de ejemplo para testing
    if (!this.sale || !this.sale.items || this.sale.items.length === 0) {
      this.sale = this.getExampleSale();
      console.log('Using example sale data:', this.sale);
      console.log('Example sale items:', this.sale.items);
    } else {
      console.log('Using real sale data:', this.sale);
      console.log('Real sale items:', this.sale.items);
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
      showPricesWithTax: false,
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

  formatDate(date: any): string {
    // Convertir a Date si no lo es
    let dateObj: Date;
    
    if (!date) {
      dateObj = new Date();
    } else if (typeof date === 'string') {
      dateObj = new Date(date);
    } else if (date instanceof Date) {
      dateObj = date;
    } else {
      // Intentar convertir cualquier otro tipo
      dateObj = new Date(date);
    }
    
    // Verificar si la fecha es válida
    if (isNaN(dateObj.getTime())) {
      dateObj = new Date(); // Usar fecha actual como fallback
    }
    
    return new Intl.DateTimeFormat('es-SV', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit'
    }).format(dateObj);
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
    const now = new Date();
    // Verificar que la fecha sea válida
    if (isNaN(now.getTime())) {
      return new Date(2024, 0, 1); // Fecha por defecto si hay problemas
    }
    return now;
  }

  trackByItem(index: number, item: any): any {
    return item.productId || index;
  }

  generateCode(): string {
    // Generar código único basado en timestamp y random
    const timestamp = Date.now().toString(16);
    const random = Math.random().toString(16).substring(2, 8);
    return `${timestamp.toUpperCase()}-${random.toUpperCase()}`;
  }

  generateSeal(): string {
    // Generar sello de recepción simulado
    const chars = '0123456789ABCDEF';
    let result = '';
    for (let i = 0; i < 32; i++) {
      result += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return result;
  }

  generateControlNumber(): string {
    // Generar número de control basado en fecha y establecimiento
    const date = new Date();
    const year = date.getFullYear().toString().substring(2);
    const month = (date.getMonth() + 1).toString().padStart(2, '0');
    const day = date.getDate().toString().padStart(2, '0');
    const establishment = this.businessConfig?.establishmentCode || '001';
    const random = Math.floor(Math.random() * 1000000).toString().padStart(6, '0');
    
    return `DTE-01-M${establishment}P${year}${month}${day}-${random}`;
  }

  getCustomerAddress(): string {
    if (this.sale?.customerAddress) {
      return this.sale.customerAddress;
    }
    
    // Dirección por defecto basada en la configuración del negocio
    return `${this.businessConfig?.city || 'San Salvador'}, ${this.businessConfig?.state || 'San Salvador'} Centro, ${this.businessConfig?.state || 'San Salvador'}, ${this.businessConfig?.country || 'El Salvador'}`;
  }

  printReceipt(): void {
    // Crear una ventana nueva para imprimir solo el ticket
    const printContent = document.querySelector('.receipt-paper');
    if (!printContent) return;

    // Crear una ventana nueva
    const printWindow = window.open('', '_blank', 'width=800,height=600');
    
    if (!printWindow) {
      // Fallback si no se puede abrir ventana nueva
      this.printWithCSS();
      return;
    }

    // Contenido HTML para la ventana de impresión con formato completo
    const printHTML = `
      <!DOCTYPE html>
      <html>
        <head>
          <title>Ticket de Venta</title>
          <style>
            * {
              margin: 0;
              padding: 0;
              box-sizing: border-box;
            }
            body {
              font-family: 'Courier New', monospace;
              font-size: 12px;
              line-height: 1.4;
              color: #000;
              background: white;
            }
            .receipt-paper {
              max-width: 300px;
              margin: 0 auto;
              padding: 10px;
              background: white;
            }
            .ticket-header h2 {
              font-size: 16px;
              font-weight: bold;
              text-align: center;
              margin-bottom: 5px;
            }
            .business-info {
              text-align: center;
              margin-bottom: 15px;
            }
            .business-name {
              font-size: 14px;
              font-weight: bold;
              margin-bottom: 2px;
            }
            .commercial-name {
              font-size: 12px;
              margin-bottom: 5px;
            }
            .tax-info, .address-info, .contact-info {
              font-size: 10px;
              margin-bottom: 3px;
            }
            .qr-code {
              margin-top: 15px;
              display: flex;
              justify-content: center;
            }
            .qr-placeholder {
              width: 80px;
              height: 80px;
              border: 2px dashed #ccc;
              display: flex;
              align-items: center;
              justify-content: center;
              font-size: 10px;
              color: #666;
            }
            .fiscal-info {
              border-bottom: 1px dashed #ccc;
              padding-bottom: 10px;
              margin-bottom: 10px;
              font-size: 10px;
            }
            .fiscal-info p {
              margin: 3px 0;
              word-break: break-all;
            }
            .customer-info {
              border-bottom: 1px dashed #ccc;
              padding-bottom: 10px;
              margin-bottom: 10px;
              font-size: 10px;
            }
            .sale-details {
              .receipt-title {
                text-align: center;
                font-size: 14px;
                font-weight: bold;
                margin: 10px 0;
                text-transform: uppercase;
                color: #000;
                letter-spacing: 0.5px;
                line-height: 1.2;
              }
              .sale-info {
                margin-bottom: 10px;
                color: #333;
                font-weight: 400;
              }
              .products-table {
                margin-bottom: 15px;
              }
              .table-header {
                display: flex;
                border-bottom: 1px solid #333;
                padding-bottom: 5px;
                margin-bottom: 5px;
                font-weight: bold;
                text-align: center;
                color: #000;
                .col-quantity { width: 15%; }
                .col-description { width: 45%; }
                .col-price { width: 20%; }
                .col-total { width: 20%; }
              }
              .product-row {
                display: flex;
                padding: 3px 0;
                border-bottom: 1px dotted #ccc;
                color: #333;
                font-weight: 400;
                .col-quantity { width: 15%; text-align: center; }
                .col-description { width: 45%; padding-left: 5px; }
                .col-price { width: 20%; text-align: right; }
                .col-total { width: 20%; text-align: right; }
              }
              .totals-section {
                border-top: 2px solid #333;
                padding-top: 10px;
                margin-bottom: 15px;
                color: #333;
                font-weight: 400;
              }
              .total-row {
                display: flex;
                justify-content: space-between;
                padding: 2px 0;
                border-bottom: 1px dotted #ccc;
                color: #333;
                font-weight: 400;
                &.highlight {
                  border-top: 1px solid #333;
                  border-bottom: 2px solid #333;
                  padding: 5px 0;
                  font-weight: bold;
                  color: #000;
                }
              }
              .payment-info {
                border-top: 1px dashed #ccc;
                padding-top: 10px;
                margin-bottom: 10px;
                color: #333;
                font-weight: 400;
                .payment-details {
                  margin-top: 10px;
                  .payment-row {
                    display: flex;
                    justify-content: space-between;
                    padding: 2px 0;
                    color: #333;
                    font-weight: 400;
                  }
                }
              }
            }
            .receipt-title {
              text-align: center;
              font-size: 14px;
              font-weight: bold;
              margin: 10px 0;
              border-top: 1px dashed #000;
              border-bottom: 1px dashed #000;
              padding: 5px 0;
            }
            .sale-info {
              font-size: 10px;
              margin-bottom: 10px;
            }
            .products-table {
              margin-bottom: 10px;
            }
            .table-header {
              display: flex;
              font-weight: bold;
              font-size: 10px;
              border-bottom: 1px solid #000;
              padding: 3px 0;
            }
            .col-quantity { width: 15%; }
            .col-description { width: 45%; }
            .col-price { width: 20%; text-align: right; }
            .col-total { width: 20%; text-align: right; }
            .product-row {
              display: flex;
              font-size: 10px;
              padding: 2px 0;
              border-bottom: 1px dotted #ccc;
            }
            .totals-section {
              margin-top: 10px;
              font-size: 10px;
            }
            .total-row {
              display: flex;
              justify-content: space-between;
              margin-bottom: 2px;
            }
            .highlight {
              border-top: 1px solid #000;
              padding-top: 3px;
              font-weight: bold;
            }
            .payment-info {
              margin-top: 10px;
              font-size: 10px;
            }
            .payment-row {
              display: flex;
              justify-content: space-between;
              margin-bottom: 2px;
            }
            .receipt-footer {
              text-align: center;
              margin-top: 15px;
              font-size: 10px;
            }
            .footer-message {
              font-weight: bold;
              margin-bottom: 5px;
            }
            .thank-you {
              font-style: italic;
            }
            @media print {
              body { margin: 0; }
              .receipt-paper { margin: 0; }
            }
          </style>
        </head>
        <body>
          ${printContent.outerHTML}
        </body>
      </html>
    `;

    // Escribir el contenido y imprimir
    printWindow.document.write(printHTML);
    printWindow.document.close();
    
    // Esperar a que cargue el contenido y luego imprimir
    printWindow.onload = () => {
      printWindow.focus();
      printWindow.print();
      printWindow.close();
    };
  }

  private printWithCSS(): void {
    // Método alternativo usando CSS para ocultar elementos no deseados
    const originalTitle = document.title;
    document.title = 'Ticket de Venta';
    
    // Agregar clase para ocultar elementos del modal
    document.body.classList.add('printing-receipt');
    
    // Crear estilos de impresión
    const printStyles = document.createElement('style');
    printStyles.textContent = `
      @media print {
        body * {
          visibility: hidden;
        }
        .receipt-paper, .receipt-paper * {
          visibility: visible;
        }
        .receipt-paper {
          position: absolute;
          left: 0;
          top: 0;
          width: 100%;
        }
        .receipt-actions {
          display: none !important;
        }
        .modal-header, .modal-actions {
          display: none !important;
        }
      }
    `;
    document.head.appendChild(printStyles);
    
    // Imprimir
    window.print();
    
    // Limpiar después de imprimir
    setTimeout(() => {
      document.body.classList.remove('printing-receipt');
      document.head.removeChild(printStyles);
      document.title = originalTitle;
    }, 1000);
  }

  private getExampleSale(): Sale {
    return {
      id: 1,
      invoiceNumber: 'CF-241012-000001',
      invoiceType: 'consumidor_final',
      customerName: 'Cliente Varios',
      customerDocument: '',
      customerEmail: '',
      customerAddress: 'San Salvador, San Salvador Centro, San Salvador, El Salvador',
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
  }
}
