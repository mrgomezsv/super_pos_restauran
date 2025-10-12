import { Component, Inject, OnInit } from '@angular/core';
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
  businessConfig: BusinessConfiguration | null = null;
  ticketTemplate: TicketTemplate | null = null;

  constructor(
    public dialogRef: MatDialogRef<ReceiptModalComponent>,
    @Inject(MAT_DIALOG_DATA) public data: { sale: Sale },
    private businessService: BusinessService
  ) {}

  ngOnInit(): void {
    this.loadBusinessConfiguration();
  }

  private loadBusinessConfiguration(): void {
    // Cargar configuración del negocio
    this.businessService.getConfiguration().subscribe({
      next: (config) => {
        this.businessConfig = config;
      },
      error: (error) => {
        console.error('Error loading business configuration:', error);
      }
    });

    // Cargar plantilla de ticket
    this.businessService.getTicketTemplate().subscribe({
      next: (template) => {
        this.ticketTemplate = template;
      },
      error: (error) => {
        console.error('Error loading ticket template:', error);
      }
    });
  }

  onClose(): void {
    this.dialogRef.close();
  }

}
