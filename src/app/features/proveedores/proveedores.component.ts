import { Component, OnDestroy, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { HttpClient, HttpErrorResponse } from '@angular/common/http';
import { MatCardModule } from '@angular/material/card';
import { MatButtonModule } from '@angular/material/button';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatTableModule } from '@angular/material/table';
import { MatIconModule } from '@angular/material/icon';
import { MatMenuModule } from '@angular/material/menu';
import { MatTooltipModule } from '@angular/material/tooltip';
import { ToastrService } from 'ngx-toastr';
import { environment } from '../../../environments/environment';
import { AuthService } from '../../core/services/auth.service';

@Component({
  selector: 'app-proveedores',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    MatCardModule,
    MatButtonModule,
    MatFormFieldModule,
    MatInputModule,
    MatTableModule,
    MatIconModule,
    MatMenuModule,
    MatTooltipModule
  ],
  templateUrl: './proveedores.component.html',
  styleUrls: ['./proveedores.component.scss']
})
export class ProveedoresComponent implements OnInit, OnDestroy {
  cols = ['name', 'nit', 'nrc', 'contact_person', 'phone', 'actions'];
  suppliers: any[] = [];
  form: FormGroup;
  loading = false;
  showDialog = false;
  editingSupplier: any = null;
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
      email: [''],
      email2: [''],
      email3: [''],
      phone: [''],
      phone2: [''],
      phone3: [''],
      address: [''],
      contact_person: [''],
      business_activity: ['']
    });

    ['email', 'email2', 'email3'].forEach(field => {
      const control = this.form.get(field);
      control?.valueChanges.subscribe(value => {
        if (value && value.trim()) {
          control.setValidators([Validators.email]);
        } else {
          control?.clearValidators();
        }
        control?.updateValueAndValidity({ emitEvent: false });
      });
    });
  }

  ngOnInit(): void {
    this.load();
  }

  ngOnDestroy(): void {
    // No listeners por limpiar actualmente
  }

  load(): void {
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

  openDialog(supplier?: any): void {
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

  closeDialog(): void {
    this.showDialog = false;
    this.editingSupplier = null;
    this.form.reset();
    this.form.markAsUntouched();
  }

  create(): void {
    if (this.form.invalid) {
      Object.keys(this.form.controls).forEach(key => {
        this.form.get(key)?.markAsTouched();
      });
      this.toastr.warning('Por favor completa todos los campos requeridos');
      return;
    }

    if (!this.authService.hasCompany() && !this.authService.isSudo()) {
      this.toastr.error('Debes seleccionar una compañía para agregar proveedores');
      return;
    }

    this.loading = true;
    const payload = {
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
      ? this.http.put<any>(`${this.api}/${this.editingSupplier.id}`, payload)
      : this.http.post<any>(this.api, payload);

    request.subscribe({
      next: () => {
        this.toastr.success(this.editingSupplier ? 'Proveedor actualizado exitosamente' : 'Proveedor agregado exitosamente');
        this.closeDialog();
        this.load();
      },
      error: (err: HttpErrorResponse) => {
        console.error('Error guardando proveedor:', err);
        const message = err.error?.detail || err.error?.message || (this.editingSupplier ? 'Error al actualizar proveedor' : 'Error al agregar proveedor');
        this.toastr.error(message);
        this.loading = false;
      }
    });
  }

  editSupplier(supplier: any): void {
    this.openDialog(supplier);
  }

  deleteSupplier(supplier: any): void {
    if (!confirm(`¿Estás seguro de eliminar al proveedor "${supplier.name}"?`)) {
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

