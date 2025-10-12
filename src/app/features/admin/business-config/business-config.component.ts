import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, Validators, ReactiveFormsModule } from '@angular/forms';
import { Subject, takeUntil } from 'rxjs';
import { MatCardModule } from '@angular/material/card';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatSelectModule } from '@angular/material/select';
import { MatCheckboxModule } from '@angular/material/checkbox';
import { MatTabsModule } from '@angular/material/tabs';
import { MatDividerModule } from '@angular/material/divider';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatProgressBarModule } from '@angular/material/progress-bar';
import { MatTooltipModule } from '@angular/material/tooltip';
import { MatDialog } from '@angular/material/dialog';
import { ToastrService } from 'ngx-toastr';

import { BusinessService } from '../../../core/services/business.service';
import { BusinessConfiguration, TicketTemplate } from '../../../core/models/business.model';
import { TicketPreviewComponent } from '../../../shared/components/ticket-preview/ticket-preview.component';
import { ConfirmationDialogComponent, ConfirmationDialogData } from '../../../shared/components/confirmation-dialog/confirmation-dialog.component';

@Component({
  selector: 'app-business-config',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    MatCardModule,
    MatFormFieldModule,
    MatInputModule,
    MatButtonModule,
    MatIconModule,
    MatSelectModule,
    MatCheckboxModule,
    MatTabsModule,
    MatDividerModule,
    MatProgressSpinnerModule,
    MatProgressBarModule,
    MatTooltipModule,
    TicketPreviewComponent
  ],
  templateUrl: './business-config.component.html',
  styleUrls: ['./business-config.component.scss']
})
export class BusinessConfigComponent implements OnInit, OnDestroy {
  businessForm: FormGroup;
  isLoading = false;
  isSaving = false;
  showPreview = false;
  saveSuccess = false;
  currentConfig: BusinessConfiguration | null = null;
  ticketTemplate: TicketTemplate | null = null;
  expandedSections: Set<string> = new Set(['company', 'contact', 'tickets', 'labels']);
  private destroy$ = new Subject<void>();

  currencies = [
    { value: 'USD', label: 'Dólar Americano (USD)' },
    { value: 'EUR', label: 'Euro (EUR)' },
    { value: 'SVC', label: 'Colón Salvadoreño (SVC)' }
  ];

  countries = [
    { value: 'El Salvador', label: 'El Salvador' },
    { value: 'Guatemala', label: 'Guatemala' },
    { value: 'Honduras', label: 'Honduras' },
    { value: 'Nicaragua', label: 'Nicaragua' },
    { value: 'Costa Rica', label: 'Costa Rica' },
    { value: 'Panamá', label: 'Panamá' }
  ];

  economicActivities = [
    'Comercio al por menor',
    'Restaurantes',
    'Servicios profesionales',
    'Manufactura',
    'Construcción',
    'Transporte',
    'Educación',
    'Salud',
    'Tecnología',
    'Otros'
  ];

  constructor(
    private fb: FormBuilder,
    private businessService: BusinessService,
    private toastr: ToastrService,
    private dialog: MatDialog
  ) {
    this.businessForm = this.createForm();
  }

  ngOnInit(): void {
    this.loadBusinessConfiguration();
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  private createForm(): FormGroup {
    return this.fb.group({
      // Información de la empresa
      businessName: ['', [Validators.required, Validators.minLength(3)]],
      commercialName: ['', [Validators.required, Validators.minLength(3)]],
      taxId: ['', [Validators.required, Validators.pattern(/^\d{4}-\d{6}-\d{3}-\d{1}$/)]],
      registrationNumber: ['', [Validators.required, Validators.pattern(/^\d{6}-\d{1}$/)]],
      economicActivity: ['', Validators.required],
      
      // Información de contacto
      address: ['', Validators.required],
      city: ['', Validators.required],
      state: ['', Validators.required],
      country: ['El Salvador', Validators.required],
      zipCode: [''],
      phone: ['', [Validators.required, Validators.pattern(/^\d{4}-\d{4}$/)]],
      email: ['', [Validators.required, Validators.email]],
      
      // Información del establecimiento
      establishmentName: ['Casa Matriz', Validators.required],
      establishmentCode: ['001', Validators.required],
      
      // Configuración de tickets
      receiptHeader: ['Gracias por su compra'],
      receiptFooter: ['¡Vuelva pronto!'],
      defaultObservations: [''],
      
      // Configuración fiscal
      currency: ['USD', Validators.required],
      defaultTaxRate: [15, [Validators.required, Validators.min(0), Validators.max(100)]],
      allowNegativeStock: [false],
      requireCustomerInfo: [false],
      
      // Configuración de impresión
      printLogo: [false],
      logoPath: [''],
      printQRCode: [false],
      qrCodeUrl: [''],
      
      // Etiquetas del ticket
      receiptTitle: ['FACTURA'],
      dateLabel: ['FECHA:'],
      generationDateLabel: ['FECHA GENERACIÓN:'],
      generationCodeLabel: ['CÓDIGO DE GENERACIÓN:'],
      receptionSealLabel: ['SELLO DE RECEPCIÓN:'],
      controlNumberLabel: ['NÚMERO DE CONTROL:'],
      transmissionLabel: ['TRANSMISIÓN:'],
      modelLabel: ['MODELO:'],
      invoiceNumberLabel: ['FACTURA N°:'],
      cashierLabel: ['CAJERO:'],
      customerLabel: ['CLIENTE:'],
      recipientLabel: ['RECEPTOR:'],
      duiLabel: ['DUI:'],
      addressLabel: ['DIRECCIÓN:'],
      subtotalLabel: ['SUBTOTAL:'],
      taxLabel: ['IVA:'],
      totalLabel: ['TOTAL:'],
      paymentMethodLabel: ['MÉTODO DE PAGO:'],
      cashReceivedLabel: ['EFECTIVO RECIBIDO:'],
      cashReturnedLabel: ['EFECTIVO DEVUELTO:'],
      observationsLabel: ['OBSERVACIONES:']
    });
  }

  private loadBusinessConfiguration(): void {
    this.isLoading = true;
    
    this.businessService.getConfiguration()
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (config) => {
          this.businessForm.patchValue(config);
          this.isLoading = false;
        },
        error: (error) => {
          console.error('Error loading business configuration:', error);
          this.toastr.error('Error al cargar la configuración del negocio');
          this.isLoading = false;
        }
      });
  }

  onSave(): void {
    if (!this.businessForm.valid) {
      this.markFormGroupTouched();
      this.toastr.warning('Por favor, complete todos los campos requeridos');
      return;
    }

    const dialogData: ConfirmationDialogData = {
      title: 'Guardar Configuración',
      message: '¿Está seguro de que desea guardar los cambios realizados en la configuración del negocio? Esta acción actualizará todos los tickets y documentos.',
      confirmText: 'Guardar',
      cancelText: 'Cancelar',
      type: 'info',
      icon: 'save'
    };

    const dialogRef = this.dialog.open(ConfirmationDialogComponent, {
      width: '400px',
      data: dialogData,
      disableClose: true
    });

    dialogRef.afterClosed().subscribe(result => {
      if (result) {
        this.performSave();
      }
    });
  }

  private performSave(): void {
    this.isSaving = true;
    this.saveSuccess = false;
    
    const formData = this.businessForm.value;
    
    this.businessService.updateConfiguration(formData)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (config) => {
          this.toastr.success('Configuración guardada exitosamente');
          this.isSaving = false;
          this.saveSuccess = true;
          this.businessForm.markAsPristine();
          
          // Ocultar mensaje de éxito después de 3 segundos
          setTimeout(() => {
            this.saveSuccess = false;
          }, 3000);
        },
        error: (error) => {
          console.error('Error saving business configuration:', error);
          this.toastr.error('Error al guardar la configuración');
          this.isSaving = false;
          this.saveSuccess = false;
        }
      });
  }

  onRestore(): void {
    const dialogData: ConfirmationDialogData = {
      title: 'Restaurar Configuración',
      message: '¿Está seguro de que desea restaurar la configuración a los valores por defecto? Todos los cambios actuales se perderán y no se podrán recuperar.',
      confirmText: 'Restaurar',
      cancelText: 'Cancelar',
      type: 'danger',
      icon: 'restore'
    };

    const dialogRef = this.dialog.open(ConfirmationDialogComponent, {
      width: '400px',
      data: dialogData,
      disableClose: true
    });

    dialogRef.afterClosed().subscribe(result => {
      if (result) {
        this.performRestore();
      }
    });
  }

  private performRestore(): void {
    this.businessForm.reset();
    this.businessService.getConfiguration()
      .pipe(takeUntil(this.destroy$))
      .subscribe(config => {
        this.businessForm.patchValue(config);
        this.toastr.success('Configuración restaurada a los valores por defecto');
        this.businessForm.markAsPristine();
      });
  }

  onReset(): void {
    this.loadBusinessConfiguration();
    this.toastr.info('Configuración restaurada a los valores guardados');
  }

  previewTicket(): void {
    if (this.businessForm.valid) {
      // Actualizar la configuración actual con los datos del formulario
      this.currentConfig = { ...this.currentConfig, ...this.businessForm.value };
      
      // Mostrar/ocultar la vista previa
      this.showPreview = !this.showPreview;
      
      if (this.showPreview) {
        this.toastr.success('Vista previa del ticket activada');
      } else {
        this.toastr.info('Vista previa del ticket oculta');
      }
    } else {
      this.markFormGroupTouched();
      this.toastr.warning('Por favor, complete todos los campos requeridos antes de ver la vista previa');
    }
  }

  private markFormGroupTouched(): void {
    Object.keys(this.businessForm.controls).forEach(key => {
      const control = this.businessForm.get(key);
      control?.markAsTouched();
    });
  }

  // Getters para validación de errores
  getFieldError(fieldName: string): string {
    const control = this.businessForm.get(fieldName);
    if (control?.errors && control.touched) {
      if (control.errors['required']) {
        return 'Este campo es requerido';
      }
      if (control.errors['email']) {
        return 'Formato de email inválido';
      }
      if (control.errors['pattern']) {
        if (fieldName === 'taxId') {
          return 'Formato: XXXX-XXXXXX-XXX-X';
        }
        if (fieldName === 'registrationNumber') {
          return 'Formato: XXXXXX-X';
        }
        if (fieldName === 'phone') {
          return 'Formato: XXXX-XXXX';
        }
        return 'Formato inválido';
      }
      if (control.errors['minlength']) {
        return `Mínimo ${control.errors['minlength'].requiredLength} caracteres`;
      }
      if (control.errors['min']) {
        return `Valor mínimo: ${control.errors['min'].min}`;
      }
      if (control.errors['max']) {
        return `Valor máximo: ${control.errors['max'].max}`;
      }
    }
    return '';
  }

  hasFieldError(fieldName: string): boolean {
    const control = this.businessForm.get(fieldName);
    return !!(control?.errors && control.touched);
  }

  // Métodos de ayuda para formateo
  formatNIT(event: any): void {
    let value = event.target.value.replace(/\D/g, '');
    if (value.length >= 4) {
      value = value.substring(0, 4) + '-' + value.substring(4);
    }
    if (value.length >= 11) {
      value = value.substring(0, 11) + '-' + value.substring(11);
    }
    if (value.length >= 15) {
      value = value.substring(0, 15) + '-' + value.substring(15);
    }
    if (value.length > 18) {
      value = value.substring(0, 18);
    }
    this.businessForm.get('taxId')?.setValue(value, { emitEvent: false });
  }

  formatPhone(event: any): void {
    let value = event.target.value.replace(/\D/g, '');
    if (value.length >= 4) {
      value = value.substring(0, 4) + '-' + value.substring(4);
    }
    if (value.length > 9) {
      value = value.substring(0, 9);
    }
    this.businessForm.get('phone')?.setValue(value, { emitEvent: false });
  }

  formatRegistrationNumber(event: any): void {
    let value = event.target.value.replace(/\D/g, '');
    if (value.length >= 6) {
      value = value.substring(0, 6) + '-' + value.substring(6);
    }
    if (value.length > 8) {
      value = value.substring(0, 8);
    }
    this.businessForm.get('registrationNumber')?.setValue(value, { emitEvent: false });
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

  // Métodos para el progreso de configuración
  getCompletionPercentage(): number {
    const totalFields = Object.keys(this.businessForm.controls).length;
    const completedFields = Object.values(this.businessForm.controls).filter(control => 
      control.value && control.value.toString().trim() !== ''
    ).length;
    return Math.round((completedFields / totalFields) * 100);
  }

  getCompletedFields(): number {
    return Object.values(this.businessForm.controls).filter(control => 
      control.value && control.value.toString().trim() !== ''
    ).length;
  }

  getRemainingFields(): number {
    const totalFields = Object.keys(this.businessForm.controls).length;
    return totalFields - this.getCompletedFields();
  }

  // Métodos para secciones expandibles
  toggleSection(sectionId: string): void {
    if (this.expandedSections.has(sectionId)) {
      this.expandedSections.delete(sectionId);
    } else {
      this.expandedSections.add(sectionId);
    }
  }

  isSectionExpanded(sectionId: string): boolean {
    return this.expandedSections.has(sectionId);
  }

  clearSection(sectionId: string): void {
    const sectionFields: { [key: string]: string[] } = {
      'company': ['businessName', 'commercialName', 'taxId', 'registrationNumber', 'economicActivity', 'establishmentName', 'establishmentCode'],
      'contact': ['address', 'city', 'state', 'country', 'zipCode', 'phone', 'email'],
      'tickets': ['receiptHeader', 'receiptFooter', 'defaultObservations', 'currency', 'defaultTaxRate', 'logoPath', 'qrCodeUrl', 'allowNegativeStock', 'requireCustomerInfo', 'printLogo', 'printQRCode'],
      'labels': ['receiptTitle', 'dateLabel', 'generationDateLabel', 'generationCodeLabel', 'receptionSealLabel', 'controlNumberLabel', 'transmissionLabel', 'modelLabel', 'invoiceNumberLabel', 'cashierLabel', 'customerLabel', 'recipientLabel', 'duiLabel', 'addressLabel', 'subtotalLabel', 'taxLabel', 'totalLabel', 'paymentMethodLabel', 'cashReceivedLabel', 'cashReturnedLabel', 'observationsLabel']
    };

    const fieldsToClear = sectionFields[sectionId];
    if (fieldsToClear) {
      fieldsToClear.forEach(fieldName => {
        if (this.businessForm.get(fieldName)) {
          this.businessForm.get(fieldName)?.setValue('');
        }
      });
      this.toastr.info(`Sección ${sectionId} limpiada`);
    }
  }
}
