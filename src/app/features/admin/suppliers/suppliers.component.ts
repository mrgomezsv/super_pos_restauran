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
  cols = ['name', 'taxId', 'email', 'actions'];
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
      taxId: [''], 
      email: ['', []]  // Email opcional sin validación (se validará solo si tiene valor)
    });
    
    // Validación condicional del email: solo validar si tiene valor
    this.emailSubscription = this.form.get('email')?.valueChanges.subscribe(value => {
      const emailControl = this.form.get('email');
      if (value && value.trim()) {
        // Si hay valor, validar formato de email
        emailControl?.setValidators([Validators.email]);
      } else {
        // Si está vacío, no validar
        emailControl?.clearValidators();
      }
      emailControl?.updateValueAndValidity({ emitEvent: false });
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
        name: supplier.name,
        taxId: supplier.taxId || '',
        email: supplier.email || ''
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
      taxId: this.form.value.taxId?.trim() || null,
      email: this.form.value.email?.trim() || null,
      phone: null,
      address: null,
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


