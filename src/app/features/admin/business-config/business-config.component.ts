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
import { MatSnackBarModule } from '@angular/material/snack-bar';
import { HttpClient } from '@angular/common/http';
import { ToastrService } from 'ngx-toastr';
import { environment } from '../../../../environments/environment';

import { ConfirmationDialogComponent, ConfirmationDialogData } from '../../../shared/components/confirmation-dialog/confirmation-dialog.component';

interface BusinessConfig {
  id: number;
  nombre: string;
  razonSocial: string;
  nit: string;
  nrc?: string;
  direccion?: string;
  telefono?: string;
  email?: string;
  sitioWeb?: string;
  logoUrl?: string;
  moneda: string;
  pais: string;
  ciudad?: string;
  codigoPostal?: string;
  regimenFiscal?: string;
  actividadEconomica?: string;
  fechaInicioOperaciones?: string;
  representanteLegal?: string;
  contador?: string;
  auditor?: string;
  configuracionFiscal?: any;
  configuracionContable?: any;
  configuracionPOS?: any;
  createdAt: string;
  updatedAt: string;
}

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
    MatSnackBarModule
  ],
  templateUrl: './business-config.component.html',
  styleUrls: ['./business-config.component.scss']
})
export class BusinessConfigComponent implements OnInit, OnDestroy {
  private readonly api = `${environment.apiUrl}/business/config`;
  
  businessForm: FormGroup;
  isLoading = false;
  isSaving = false;
  showPreview = false;
  saveSuccess = false;
  currentConfig: BusinessConfig | null = null;
  expandedSections: Set<string> = new Set(['company', 'contact', 'fiscal', 'accounting']);
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

  fiscalRegimes = [
    'Contribuyente Especial',
    'Contribuyente Ordinario',
    'Exento',
    'Pequeño Contribuyente'
  ];

  constructor(
    private fb: FormBuilder,
    private http: HttpClient,
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
      // Información básica de la empresa
      nombre: ['', [Validators.required, Validators.minLength(3)]],
      razonSocial: ['', [Validators.required, Validators.minLength(3)]],
      nit: ['', [Validators.required, Validators.minLength(9)]],
      nrc: [''],
      
      // Información de contacto
      direccion: [''],
      telefono: [''],
      email: ['', [Validators.email]],
      sitioWeb: [''],
      ciudad: [''],
      codigoPostal: [''],
      
      // Información fiscal
      moneda: ['USD', Validators.required],
      pais: ['El Salvador', Validators.required],
      regimenFiscal: [''],
      actividadEconomica: [''],
      fechaInicioOperaciones: [''],
      
      // Información legal
      representanteLegal: [''],
      contador: [''],
      auditor: [''],
      
      // Configuraciones
      configuracionFiscal: [{}],
      configuracionContable: [{}],
      configuracionPOS: [{}]
    });
  }

  private loadBusinessConfiguration(): void {
    this.isLoading = true;
    
    this.http.get<BusinessConfig>(this.api).subscribe({
      next: (config) => {
        this.currentConfig = config;
        this.businessForm.patchValue({
          nombre: config.nombre,
          razonSocial: config.razonSocial,
          nit: config.nit,
          nrc: config.nrc || '',
          direccion: config.direccion || '',
          telefono: config.telefono || '',
          email: config.email || '',
          sitioWeb: config.sitioWeb || '',
          ciudad: config.ciudad || '',
          codigoPostal: config.codigoPostal || '',
          moneda: config.moneda,
          pais: config.pais,
          regimenFiscal: config.regimenFiscal || '',
          actividadEconomica: config.actividadEconomica || '',
          fechaInicioOperaciones: config.fechaInicioOperaciones || '',
          representanteLegal: config.representanteLegal || '',
          contador: config.contador || '',
          auditor: config.auditor || '',
          configuracionFiscal: config.configuracionFiscal || {},
          configuracionContable: config.configuracionContable || {},
          configuracionPOS: config.configuracionPOS || {}
        });
        this.isLoading = false;
      },
      error: (error) => {
        console.error('Error cargando configuración:', error);
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
      message: '¿Está seguro de que desea guardar los cambios realizados en la configuración del negocio?',
      confirmText: 'Guardar',
      cancelText: 'Cancelar',
      type: 'info',
      icon: 'save'
    };

    const dialogRef = this.dialog.open(ConfirmationDialogComponent, {
      width: '400px',
      data: dialogData,
      disableClose: true,
      hasBackdrop: true,
      backdropClass: 'confirmation-dialog-backdrop',
      position: {
        top: '50%',
        left: '50%'
      },
      panelClass: 'confirmation-dialog-container'
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
    
    this.http.put<BusinessConfig>(this.api, formData).subscribe({
      next: (config) => {
        this.currentConfig = config;
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
        console.error('Error guardando configuración:', error);
        this.toastr.error(error.error?.detail || 'Error al guardar la configuración');
        this.isSaving = false;
        this.saveSuccess = false;
      }
    });
  }

  onReset(): void {
    this.loadBusinessConfiguration();
    this.toastr.info('Configuración restaurada a los valores guardados');
  }

  onUploadLogo(event: any): void {
    const file = event.target.files[0];
    if (!file) return;

    // Validar tipo de archivo
    if (!file.type.startsWith('image/')) {
      this.toastr.error('Solo se permiten archivos de imagen');
      return;
    }

    // Validar tamaño (máximo 2MB)
    if (file.size > 2 * 1024 * 1024) {
      this.toastr.error('El archivo no puede ser mayor a 2MB');
      return;
    }

    const formData = new FormData();
    formData.append('file', file);

    this.http.post(`${this.api}/logo`, formData).subscribe({
      next: (response: any) => {
        this.toastr.success('Logo subido exitosamente');
        // Actualizar la configuración local
        if (this.currentConfig) {
          this.currentConfig.logoUrl = response.logoUrl;
        }
      },
      error: (error) => {
        console.error('Error subiendo logo:', error);
        this.toastr.error(error.error?.detail || 'Error al subir el logo');
      }
    });
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
      if (control.errors['minlength']) {
        return `Mínimo ${control.errors['minlength'].requiredLength} caracteres`;
      }
    }
    return '';
  }

  hasFieldError(fieldName: string): boolean {
    const control = this.businessForm.get(fieldName);
    return !!(control?.errors && control.touched);
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
      'company': ['nombre', 'razonSocial', 'nit', 'nrc'],
      'contact': ['direccion', 'telefono', 'email', 'sitioWeb', 'ciudad', 'codigoPostal'],
      'fiscal': ['regimenFiscal', 'actividadEconomica', 'fechaInicioOperaciones'],
      'accounting': ['representanteLegal', 'contador', 'auditor']
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