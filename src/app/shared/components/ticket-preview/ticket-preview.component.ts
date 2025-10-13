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
  @Input() saleData: Sale | null = null;

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
    console.log('TicketPreview ngOnInit - saleData received:', this.saleData);
    
    // Si no hay configuración, usar valores por defecto
    if (!this.businessConfig) {
      this.businessConfig = this.getDefaultConfig();
    }
    if (!this.ticketTemplate) {
      this.ticketTemplate = this.getDefaultTemplate();
    }
    
    // Si se proporcionan datos de venta reales, usarlos en lugar de los de ejemplo
    if (this.saleData) {
      this.sampleSale = this.saleData;
      console.log('Using real sale data in ticket preview:', this.sampleSale);
      console.log('Real sale items:', this.sampleSale.items);
    } else {
      console.log('Using example sale data in ticket preview:', this.sampleSale);
      console.log('Example sale items:', this.sampleSale.items);
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

  printReceipt(): void {
    // Crear una ventana nueva para imprimir solo el ticket
    const printContent = document.querySelector('.ticket-container');
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
            .ticket-container {
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
              .ticket-container { margin: 0; }
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
        .ticket-container, .ticket-container * {
          visibility: visible;
        }
        .ticket-container {
          position: absolute;
          left: 0;
          top: 0;
          width: 100%;
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
}
