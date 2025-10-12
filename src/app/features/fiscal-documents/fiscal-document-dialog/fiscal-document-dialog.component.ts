import { Component, OnInit, OnDestroy, Input, Output, EventEmitter } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, Validators, ReactiveFormsModule } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatCheckboxModule } from '@angular/material/checkbox';
import { MatTooltipModule } from '@angular/material/tooltip';
import { Subject, takeUntil } from 'rxjs';
import { ToastrService } from 'ngx-toastr';

import { FiscalDocumentService } from '../../../core/services/fiscal-document.service';
import { FiscalDocument } from '../../../core/models/fiscal-document.model';

@Component({
  selector: 'app-fiscal-document-dialog',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    MatButtonModule,
    MatIconModule,
    MatFormFieldModule,
    MatInputModule,
    MatCheckboxModule,
    MatTooltipModule
  ],
  templateUrl: './fiscal-document-dialog.component.html',
  styleUrls: ['./fiscal-document-dialog.component.scss']
})
export class FiscalDocumentDialogComponent implements OnInit, OnDestroy {
  @Input() document: FiscalDocument | null = null;
  @Output() close = new EventEmitter<boolean>();

  documentForm!: FormGroup;
  isEdit = false;
  private destroy$ = new Subject<void>();

  constructor(
    private fb: FormBuilder,
    private fiscalDocumentService: FiscalDocumentService,
    private toastr: ToastrService
  ) {
    this.initializeForm();
  }

  ngOnInit(): void {
    this.isEdit = !!this.document;
    
    if (this.isEdit && this.document) {
      this.documentForm.patchValue(this.document);
      // En modo edición, no permitir cambiar el correlativo inicial
      this.documentForm.get('initialCorrelative')?.disable();
    }
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  private initializeForm(): void {
    this.documentForm = this.fb.group({
      name: ['', [Validators.required, Validators.minLength(2)]],
      description: [''],
      prefix: ['', [Validators.required, Validators.minLength(1), Validators.maxLength(10)]],
      initialCorrelative: [1, [Validators.required, Validators.min(1)]],
      isActive: [true]
    });
  }

  onSave(): void {
    if (this.documentForm.valid) {
      const documentData = { ...this.documentForm.getRawValue() };
      
      if (this.isEdit && this.document) {
        // Para edición, no enviar el correlativo inicial
        delete documentData.initialCorrelative;
        
        this.fiscalDocumentService.updateFiscalDocument(this.document.id, documentData)
          .pipe(takeUntil(this.destroy$))
          .subscribe({
            next: () => {
              this.toastr.success('Documento fiscal actualizado exitosamente');
              this.close.emit(true);
            },
            error: (error) => {
              console.error('Error updating fiscal document:', error);
              const errorMessage = error.error?.detail || 'Error al actualizar el documento fiscal';
              this.toastr.error(errorMessage);
            }
          });
      } else {
        this.fiscalDocumentService.createFiscalDocument(documentData)
          .pipe(takeUntil(this.destroy$))
          .subscribe({
            next: (response) => {
              this.toastr.success(`✅ Documento fiscal creado exitosamente`, `${response.name} (${response.prefix})`);
              this.close.emit(true);
            },
            error: (error) => {
              console.error('Error creating fiscal document:', error);
              const errorMessage = error.error?.detail || 'Error al crear el documento fiscal';
              this.toastr.error(errorMessage);
            }
          });
      }
    } else {
      this.markFormGroupTouched();
      this.toastr.warning('Por favor, completa todos los campos requeridos');
    }
  }

  onCancel(): void {
    this.close.emit(false);
  }

  private markFormGroupTouched(): void {
    Object.keys(this.documentForm.controls).forEach(key => {
      const control = this.documentForm.get(key);
      control?.markAsTouched();
    });
  }

  getErrorMessage(controlName: string): string {
    const control = this.documentForm.get(controlName);
    if (control?.hasError('required')) {
      return 'Este campo es requerido';
    }
    if (control?.hasError('minlength')) {
      return `Mínimo ${control.errors?.['minlength'].requiredLength} caracteres`;
    }
    if (control?.hasError('maxlength')) {
      return `Máximo ${control.errors?.['maxlength'].requiredLength} caracteres`;
    }
    if (control?.hasError('min')) {
      return `El valor mínimo es ${control.errors?.['min'].min}`;
    }
    return '';
  }
}

