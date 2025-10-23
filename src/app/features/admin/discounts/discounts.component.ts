import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormBuilder, Validators } from '@angular/forms';
import { MatCardModule } from '@angular/material/card';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatButtonModule } from '@angular/material/button';
import { MatTableModule } from '@angular/material/table';
import { MatIconModule } from '@angular/material/icon';
import { ToastrService } from 'ngx-toastr';
import { HttpClient } from '@angular/common/http';
import { environment } from '../../../../environments/environment';

interface Discount {
  id: number;
  company_id?: number;
  name: string;
  percent: number;
  isActive: boolean;
  createdAt: string;
}

@Component({
  selector: 'app-admin-discounts',
  standalone: true,
  imports: [
    CommonModule, 
    ReactiveFormsModule, 
    MatCardModule, 
    MatFormFieldModule, 
    MatInputModule, 
    MatButtonModule,
    MatTableModule,
    MatIconModule
  ],
  templateUrl: './discounts.component.html',
  styles: [`
    mat-card {
      margin: 16px;
    }
    mat-card-header {
      margin-bottom: 16px;
    }
    table {
      margin-top: 16px;
    }
  `]
})
export class AdminDiscountsComponent implements OnInit {
  private readonly api = `${environment.apiUrl}/discounts`;
  displayedColumns = ['name', 'percent', 'isActive', 'actions'];
  discounts: Discount[] = [];
  isLoading = false;
  form: any;

  constructor(
    private fb: FormBuilder, 
    private toastr: ToastrService,
    private http: HttpClient
  ) {
    this.form = this.fb.group({
      name: ['', [Validators.required, Validators.minLength(2)]],
      percent: [0, [Validators.required, Validators.min(0), Validators.max(100)]]
    });
  }

  ngOnInit(): void {
    this.load();
  }

  load(): void {
    this.http.get<Discount[]>(this.api).subscribe({
      next: (data) => {
        this.discounts = data;
      },
      error: (err) => {
        console.error('Error cargando descuentos:', err);
        this.toastr.error('Error al cargar descuentos');
      }
    });
  }

  create(): void {
    if (this.form.invalid) return;
    
    this.isLoading = true;
    const payload = {
      ...this.form.value,
      isActive: true
    };

    this.http.post<Discount>(this.api, payload).subscribe({
      next: () => {
        this.toastr.success('Descuento creado exitosamente');
        this.form.reset();
        this.form.patchValue({ percent: 0 });
        this.load();
        this.isLoading = false;
      },
      error: (err) => {
        console.error('Error creando descuento:', err);
        this.toastr.error('Error al crear descuento');
        this.isLoading = false;
      }
    });
  }

  delete(id: number): void {
    if (!confirm('¿Eliminar este descuento?')) return;
    
    this.isLoading = true;
    this.http.delete(`${this.api}/${id}`).subscribe({
      next: () => {
        this.toastr.success('Descuento eliminado');
        this.load();
        this.isLoading = false;
      },
      error: (err) => {
        console.error('Error eliminando descuento:', err);
        this.toastr.error('Error al eliminar descuento');
        this.isLoading = false;
      }
    });
  }
}
