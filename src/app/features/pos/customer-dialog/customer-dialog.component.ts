import { Component, Inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, Validators, ReactiveFormsModule } from '@angular/forms';
import { MatDialogRef, MAT_DIALOG_DATA, MatDialogModule } from '@angular/material/dialog';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';

@Component({
  selector: 'app-customer-dialog',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    MatDialogModule,
    MatFormFieldModule,
    MatInputModule,
    MatButtonModule,
    MatIconModule
  ],
  template: `
    <h2 mat-dialog-title>
      <mat-icon>person</mat-icon>
      Información del Cliente
    </h2>

    <mat-dialog-content>
      <form [formGroup]="customerForm" class="customer-form">
        <mat-form-field appearance="outline" class="full-width">
          <mat-label>Nombre del Cliente</mat-label>
          <input matInput formControlName="name" placeholder="Ingrese el nombre completo">
          <mat-icon matSuffix>person</mat-icon>
        </mat-form-field>

        <mat-form-field appearance="outline" class="full-width">
          <mat-label>Documento de Identidad</mat-label>
          <input matInput formControlName="document" placeholder="Número de documento">
          <mat-icon matSuffix>badge</mat-icon>
        </mat-form-field>

        <mat-form-field appearance="outline" class="full-width">
          <mat-label>Correo Electrónico</mat-label>
          <input matInput formControlName="email" type="email" placeholder="correo@ejemplo.com">
          <mat-icon matSuffix>email</mat-icon>
        </mat-form-field>
      </form>
    </mat-dialog-content>

    <mat-dialog-actions align="end">
      <button mat-button (click)="onCancel()">Cancelar</button>
      <button mat-raised-button 
              color="primary" 
              (click)="onSave()"
              [disabled]="customerForm.invalid">
        Guardar
      </button>
    </mat-dialog-actions>
  `,
  styles: [`
    .customer-form {
      display: flex;
      flex-direction: column;
      gap: 16px;
      min-width: 350px;
    }

    .full-width {
      width: 100%;
    }

    mat-dialog-title {
      display: flex;
      align-items: center;
      gap: 8px;
    }
  `]
})
export class CustomerDialogComponent {
  customerForm: FormGroup;

  constructor(
    public dialogRef: MatDialogRef<CustomerDialogComponent>,
    @Inject(MAT_DIALOG_DATA) public data: any,
    private fb: FormBuilder
  ) {
    this.customerForm = this.fb.group({
      name: [data?.name || '', [Validators.required]],
      document: [data?.document || '', [Validators.required]],
      email: [data?.email || '', [Validators.email]]
    });
  }

  onCancel() {
    this.dialogRef.close();
  }

  onSave() {
    if (this.customerForm.valid) {
      this.dialogRef.close(this.customerForm.value);
    }
  }
}
