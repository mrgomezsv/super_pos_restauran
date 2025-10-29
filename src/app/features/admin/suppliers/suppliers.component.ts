import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormBuilder, Validators, FormGroup } from '@angular/forms';
import { Subscription } from 'rxjs';
import { MatCardModule } from '@angular/material/card';
import { MatButtonModule } from '@angular/material/button';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatTableModule } from '@angular/material/table';
import { MatIconModule } from '@angular/material/icon';
import { MatMenuModule } from '@angular/material/menu';
import { MatError } from '@angular/material/form-field';
import { MatTooltipModule } from '@angular/material/tooltip';
import { ToastrService } from 'ngx-toastr';
import { HttpClient, HttpErrorResponse } from '@angular/common/http';
import { environment } from '../../../../environments/environment';
import { AuthService } from '../../../core/services/auth.service';

@Component({
  selector: 'app-admin-suppliers',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, MatCardModule, MatButtonModule, MatFormFieldModule, MatInputModule, MatTableModule, MatIconModule, MatMenuModule, MatTooltipModule, MatError],
  templateUrl: './suppliers.component.html',
  styleUrls: ['./suppliers.component.scss'],
})
export class AdminSuppliersComponent implements OnInit, OnDestroy {
  cols = ['name', 'nit', 'nrc', 'contact_person', 'phone', 'actions'];
  suppliers: any[] = [];
  form: FormGroup;
  loading = false;
  showDialog = false;
  editingSupplier: any = null;
  private emailSubscription?: Subscription;
  private readonly api = `${environment.apiUrl}/suppliers`;
  
  constructor(
    private fb: FormBuilder, 
    private toastr: ToastrService, 
    private http: HttpClient,
    private authService: AuthService
  ) {
    this.form = this.fb.group({ 
      name: ['', [Validators.required, Validators.minLength(2)]], 
      nit: [''],
      nrc: [''],
      email: ['', []],  // Email principal opcional
      email2: ['', []], // Email secundario opcional
      email3: ['', []], // Email adicional opcional
      phone: ['', []],  // Teléfono principal opcional
      phone2: ['', []], // Teléfono secundario opcional
      phone3: ['', []], // Teléfono adicional opcional
      address: [''],
      contact_person: [''],
      business_activity: ['']
    });
    
    // Validación condicional para todos los emails: solo validar si tienen valor
    ['email', 'email2', 'email3'].forEach(emailField => {
      const emailControl = this.form.get(emailField);
      emailControl?.valueChanges.subscribe(value => {
        if (value && value.trim()) {
          emailControl?.setValidators([Validators.email]);
        } else {
          emailControl?.clearValidators();
        }
        emailControl?.updateValueAndValidity({ emitEvent: false });
      });
    });
  }

  ngOnInit() { 
    this.load(); 
  }

  ngOnDestroy() {
    this.emailSubscription?.unsubscribe();
  }

  load() { 
    this.loading = true;
    this.http.get<any[]>(this.api).subscribe({
      next: (rows) => {
        this.suppliers = rows || [];
        this.loading = false;
      },
      error: (err: HttpErrorResponse) => {
        console.error('Error cargando proveedores:', err);
        this.toastr.error(err.error?.detail || 'Error al cargar proveedores');
        this.loading = false;
      }
    });
  }

  openDialog(supplier?: any) {
    this.editingSupplier = supplier || null;
    if (supplier) {
      this.form.patchValue({
        name: supplier.name || '',
        nit: supplier.nit || '',
        nrc: supplier.nrc || '',
        email: supplier.email || '',
        email2: supplier.email2 || '',
        email3: supplier.email3 || '',
        phone: supplier.phone || '',
        phone2: supplier.phone2 || '',
        phone3: supplier.phone3 || '',
        address: supplier.address || '',
        contact_person: supplier.contact_person || '',
        business_activity: supplier.business_activity || ''
      });
    } else {
      this.form.reset();
      this.form.markAsUntouched();
    }
    this.showDialog = true;
  }

  closeDialog() {
    this.showDialog = false;
    this.editingSupplier = null;
    this.form.reset();
    this.form.markAsUntouched();
  }

  create() {
    if (this.form.invalid) {
      // Marcar todos los campos como touched para mostrar errores
      Object.keys(this.form.controls).forEach(key => {
        this.form.get(key)?.markAsTouched();
      });
      this.toastr.warning('Por favor completa todos los campos requeridos');
      return;
    }

    // Verificar que el usuario tenga una compañía asignada
    if (!this.authService.hasCompany() && !this.authService.isSudo()) {
      this.toastr.error('Debes seleccionar una compañía para agregar proveedores');
      return;
    }

    this.loading = true;
    const formValue = {
      name: this.form.value.name?.trim() || '',
      nit: this.form.value.nit?.trim() || null,
      nrc: this.form.value.nrc?.trim() || null,
      email: this.form.value.email?.trim() || null,
      email2: this.form.value.email2?.trim() || null,
      email3: this.form.value.email3?.trim() || null,
      phone: this.form.value.phone?.trim() || null,
      phone2: this.form.value.phone2?.trim() || null,
      phone3: this.form.value.phone3?.trim() || null,
      address: this.form.value.address?.trim() || null,
      contact_person: this.form.value.contact_person?.trim() || null,
      business_activity: this.form.value.business_activity?.trim() || null,
      isActive: true
    };

    const request = this.editingSupplier
      ? this.http.put<any>(`${this.api}/${this.editingSupplier.id}`, formValue)
      : this.http.post<any>(this.api, formValue);

    request.subscribe({
      next: () => {
        this.toastr.success(this.editingSupplier ? 'Proveedor actualizado exitosamente' : 'Proveedor agregado exitosamente');
        this.closeDialog();
        this.load();
      },
      error: (err: HttpErrorResponse) => {
        console.error('Error guardando proveedor:', err);
        const errorMessage = err.error?.detail || err.error?.message || (this.editingSupplier ? 'Error al actualizar proveedor' : 'Error al agregar proveedor');
        this.toastr.error(errorMessage);
        this.loading = false;
      }
    });
  }

  editSupplier(supplier: any) {
    this.openDialog(supplier);
  }

  deleteSupplier(supplier: any) {
    if (!confirm(`¿Estás seguro de eliminar el proveedor "${supplier.name}"?`)) {
      return;
    }

    this.loading = true;
    this.http.delete(`${this.api}/${supplier.id}`).subscribe({
      next: () => {
        this.toastr.success('Proveedor eliminado exitosamente');
        this.load();
      },
      error: (err: HttpErrorResponse) => {
        console.error('Error eliminando proveedor:', err);
        this.toastr.error(err.error?.detail || 'Error al eliminar proveedor');
        this.loading = false;
      }
    });
  }
}


