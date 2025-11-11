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
    <h2 mat-dialog-title class="customer-modal">
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
      gap: 20px;
      min-width: 400px;
      padding: 8px 0;
    }

    .full-width {
      width: 100%;
    }

    mat-dialog-title {
      display: flex;
      align-items: center;
      gap: 12px;
      color: white;
      font-size: 24px;
      font-weight: 700;
      
      mat-icon {
        font-size: 28px;
        width: 28px;
        height: 28px;
      }
    }

    // Mejorar los campos de formulario específicamente
    ::ng-deep mat-form-field {
      .mat-mdc-text-field-wrapper {
        min-height: 56px !important;
        padding: 0 12px !important;
        border-radius: 8px !important;
        background: #ffffff !important;
      }
      
      .mat-mdc-form-field-infix {
        min-height: 48px !important;
        padding: 12px 0 !important;
      }
      
      .mat-mdc-form-field-label {
        font-size: 14px !important;
        font-weight: 500 !important;
        color: #666 !important;
      }
      
      .mat-mdc-input-element {
        font-size: 16px !important;
        color: #333 !important;
        padding: 4px 0 !important;
      }
      
      &.mat-focused {
        .mat-mdc-form-field-outline {
          .mat-mdc-form-field-outline-thick {
            color: #017E84 !important;
            border-width: 2px !important;
          }
        }
      }
      
      &.mat-form-field-invalid {
        .mat-mdc-form-field-outline {
          .mat-mdc-form-field-outline-thick {
            color: #f44336 !important;
            border-width: 2px !important;
          }
        }
        
        .mat-mdc-form-field-label {
          color: #f44336 !important;
        }
      }
    }

    @media (max-width: 768px) {
      .customer-form {
        min-width: auto;
      }
    }

    // ESTILOS ULTRA ESPECÍFICOS PARA FORZAR LA CORRECCIÓN
    ::ng-deep .customer-modal {
      mat-form-field.mat-mdc-form-field {
        .mat-mdc-form-field-label,
        .mdc-floating-label,
        .mat-mdc-form-field-label-wrapper {
          position: absolute !important;
          top: -8px !important;
          left: 12px !important;
          background: #ffffff !important;
          padding: 0 4px !important;
          font-size: 12px !important;
          font-weight: 600 !important;
          color: #017E84 !important;
          z-index: 1 !important;
          transform: none !important;
          transform-origin: unset !important;
          transition: none !important;
          
          // Forzar todas las variantes
          &.mat-mdc-form-field-label-filled,
          &.mat-mdc-form-field-label-floating,
          &.mdc-floating-label--float-above,
          &.mat-form-field-label-filled,
          &.mat-form-field-label-floating,
          &.mdc-floating-label {
            position: absolute !important;
            top: -8px !important;
            left: 12px !important;
            background: #ffffff !important;
            padding: 0 4px !important;
            font-size: 12px !important;
            font-weight: 600 !important;
            color: #017E84 !important;
            z-index: 1 !important;
            transform: none !important;
            transform-origin: unset !important;
            transition: none !important;
          }
        }

        .mat-mdc-text-field-wrapper {
          background: #ffffff !important;
          border: 1px solid #e2e8f0 !important;
          border-radius: 8px !important;
          padding: 0 !important;
          min-height: 56px !important;
          position: relative !important;
        }

        .mat-mdc-form-field-infix {
          padding: 16px 12px 8px 12px !important;
          min-height: auto !important;
          display: block !important;
        }

        .mat-mdc-input-element {
          color: #333 !important;
          font-size: 16px !important;
          padding: 4px 0 !important;
          margin: 0 !important;
          border: none !important;
          background: transparent !important;
          outline: none !important;
          
          &::placeholder {
            color: #a0aec0 !important;
            font-style: italic !important;
          }
        }

        &.mat-focused {
          .mat-mdc-text-field-wrapper {
            border-color: #017E84 !important;
            border-width: 2px !important;
            box-shadow: 0 0 0 3px rgba(1, 126, 132, 0.1) !important;
          }
        }
      }
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
