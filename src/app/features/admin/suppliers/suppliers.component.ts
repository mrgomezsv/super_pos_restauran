import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormBuilder, Validators, FormGroup } from '@angular/forms';
import { MatCardModule } from '@angular/material/card';
import { MatButtonModule } from '@angular/material/button';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatTableModule } from '@angular/material/table';
import { ToastrService } from 'ngx-toastr';
import { HttpClient, HttpErrorResponse } from '@angular/common/http';
import { environment } from '../../../../environments/environment';
import { AuthService } from '../../../core/services/auth.service';

@Component({
  selector: 'app-admin-suppliers',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, MatCardModule, MatButtonModule, MatFormFieldModule, MatInputModule, MatTableModule],
  templateUrl: './suppliers.component.html',
})
export class AdminSuppliersComponent implements OnInit {
  cols = ['name', 'taxId', 'email'];
  suppliers: any[] = [];
  form: FormGroup;
  loading = false;
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
      email: ['', [Validators.email]]
    });
  }

  ngOnInit() { 
    this.load(); 
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

    this.http.post<any>(this.api, formValue).subscribe({
      next: () => {
        this.toastr.success('Proveedor agregado exitosamente');
        this.form.reset();
        this.form.markAsUntouched();
        this.load();
      },
      error: (err: HttpErrorResponse) => {
        console.error('Error creando proveedor:', err);
        const errorMessage = err.error?.detail || err.error?.message || 'Error al agregar proveedor';
        this.toastr.error(errorMessage);
        this.loading = false;
      }
    });
  }
}


