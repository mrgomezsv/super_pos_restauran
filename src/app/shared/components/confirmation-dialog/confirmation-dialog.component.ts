import { Component, Inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatDialogRef, MAT_DIALOG_DATA, MatDialogModule } from '@angular/material/dialog';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';

export interface ConfirmationDialogData {
  title: string;
  message: string;
  confirmText?: string;
  cancelText?: string;
  icon?: string;
  type?: 'warning' | 'info' | 'danger' | 'success';
}

@Component({
  selector: 'app-confirmation-dialog',
  standalone: true,
  imports: [
    CommonModule,
    MatDialogModule,
    MatButtonModule,
    MatIconModule
  ],
  templateUrl: './confirmation-dialog.component.html',
  styleUrls: ['./confirmation-dialog.component.scss']
})
export class ConfirmationDialogComponent {
  constructor(
    public dialogRef: MatDialogRef<ConfirmationDialogComponent>,
    @Inject(MAT_DIALOG_DATA) public data: ConfirmationDialogData
  ) {
    // Valores por defecto
    this.data.confirmText = this.data.confirmText || 'Confirmar';
    this.data.cancelText = this.data.cancelText || 'Cancelar';
    this.data.type = this.data.type || 'warning';
  }

  onConfirm(): void {
    this.dialogRef.close(true);
  }

  onCancel(): void {
    this.dialogRef.close(false);
  }

  getIconClass(): string {
    switch (this.data.type) {
      case 'danger':
        return 'danger-icon';
      case 'info':
        return 'info-icon';
      case 'success':
        return 'success-icon';
      default:
        return 'warning-icon';
    }
  }

  getIconName(): string {
    return this.data.icon || this.getDefaultIcon();
  }

  private getDefaultIcon(): string {
    switch (this.data.type) {
      case 'danger':
        return 'error';
      case 'info':
        return 'info';
      case 'success':
        return 'check_circle';
      default:
        return 'warning';
    }
  }
}
