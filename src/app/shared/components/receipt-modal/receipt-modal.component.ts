import { Component, Inject, OnInit, ViewChild } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MAT_DIALOG_DATA, MatDialogRef, MatDialogModule } from '@angular/material/dialog';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';

import { ReceiptComponent } from '../receipt/receipt.component';
import { BusinessService } from '../../../core/services/business.service';
import { Sale } from '../../../core/models/sale.model';
import { BusinessConfiguration, TicketTemplate } from '../../../core/models/business.model';

@Component({
  selector: 'app-receipt-modal',
  standalone: true,
  imports: [
    CommonModule,
    MatDialogModule,
    MatButtonModule,
    MatIconModule,
    ReceiptComponent
  ],
  templateUrl: './receipt-modal.component.html',
  styleUrls: ['./receipt-modal.component.scss']
})
export class ReceiptModalComponent implements OnInit {
  @ViewChild(ReceiptComponent) receiptComponent!: ReceiptComponent;
  
  businessConfig: BusinessConfiguration | null = null;
  ticketTemplate: TicketTemplate | null = null;

  constructor(
    public dialogRef: MatDialogRef<ReceiptModalComponent>,
    @Inject(MAT_DIALOG_DATA) public data: { 
      sale: Sale;
      businessConfig?: BusinessConfiguration;
      ticketTemplate?: TicketTemplate;
    },
    private businessService: BusinessService
  ) {}

  ngOnInit(): void {
    this.loadBusinessConfiguration();
  }

  private loadBusinessConfiguration(): void {
    // Usar configuración pasada como parámetro o cargar desde el servicio
    if (this.data.businessConfig) {
      this.businessConfig = this.data.businessConfig;
    } else {
      this.businessService.getConfiguration().subscribe({
        next: (config) => {
          this.businessConfig = config;
        },
        error: (error) => {
          console.error('Error loading business configuration:', error);
        }
      });
    }

    // Usar plantilla pasada como parámetro o cargar desde el servicio
    if (this.data.ticketTemplate) {
      this.ticketTemplate = this.data.ticketTemplate;
    } else {
      this.businessService.getTicketTemplate().subscribe({
        next: (template) => {
          this.ticketTemplate = template;
        },
        error: (error) => {
          console.error('Error loading ticket template:', error);
        }
      });
    }
  }

  onClose(): void {
    this.dialogRef.close();
  }

  onPrint(): void {
    // Llamar al método de impresión del componente receipt
    if (this.receiptComponent) {
      this.receiptComponent.printReceipt();
    }
  }

}
