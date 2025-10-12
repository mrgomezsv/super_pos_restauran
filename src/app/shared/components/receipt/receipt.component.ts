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

    // Contenido HTML para la ventana de impresión
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
            .receipt-header h2 {
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
            .col-description { width: 50%; }
            .col-price { width: 20%; text-align: right; }
            .col-total { width: 15%; text-align: right; }
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
}
