import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormBuilder, Validators } from '@angular/forms';
import { MatCardModule } from '@angular/material/card';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatButtonModule } from '@angular/material/button';
import { MatTableModule } from '@angular/material/table';
import { MatIconModule } from '@angular/material/icon';
import { MatDialogModule, MatDialog } from '@angular/material/dialog';
import { ToastrService } from 'ngx-toastr';
import { HttpClient } from '@angular/common/http';
import { environment } from '../../../../environments/environment';

interface ProductCategory {
  id: number;
  company_id: number;
  name: string;
  description?: string;
  isActive: boolean;
  createdAt: string;
}

@Component({
  selector: 'app-admin-categories',
  standalone: true,
  imports: [
    CommonModule, 
    ReactiveFormsModule, 
    MatCardModule, 
    MatFormFieldModule, 
    MatInputModule, 
    MatButtonModule,
    MatTableModule,
    MatIconModule,
    MatDialogModule
  ],
  templateUrl: './categories.component.html',
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
export class AdminCategoriesComponent implements OnInit {
  private readonly api = `${environment.apiUrl}/product-categories`;
  displayedColumns = ['name', 'description', 'actions'];
  categories: ProductCategory[] = [];
  isLoading = false;
  form: any;

  constructor(
    private fb: FormBuilder, 
    private toastr: ToastrService,
    private http: HttpClient,
    private dialog: MatDialog
  ) {
    this.form = this.fb.group({
      name: ['', [Validators.required, Validators.minLength(2)]],
      description: ['']
    });
  }

  ngOnInit(): void {
    this.load();
  }

  load(): void {
    this.http.get<ProductCategory[]>(this.api).subscribe({
      next: (data) => {
        this.categories = data;
      },
      error: (err) => {
        console.error('Error cargando categorías:', err);
        this.toastr.error('Error al cargar categorías');
      }
    });
  }

  create(): void {
    if (this.form.invalid) return;
    
    this.isLoading = true;
    const payload = {
      name: this.form.value.name.trim(),
      description: this.form.value.description?.trim() || null
    };

    this.http.post<ProductCategory>(this.api, payload).subscribe({
      next: () => {
        this.toastr.success('Categoría creada exitosamente');
        this.form.reset();
        this.load();
        this.isLoading = false;
      },
      error: (err) => {
        console.error('Error creando categoría:', err);
        this.toastr.error(err.error?.detail || 'Error al crear categoría');
        this.isLoading = false;
      }
    });
  }

  edit(category: ProductCategory): void {
    // TODO: Implementar diálogo de edición
    this.toastr.info('Función de edición próximamente');
  }

  delete(id: number): void {
    if (!confirm('¿Eliminar esta categoría?\n\nNota: No se puede eliminar si tiene productos asociados.')) return;
    
    this.isLoading = true;
    this.http.delete(`${this.api}/${id}`).subscribe({
      next: () => {
        this.toastr.success('Categoría eliminada exitosamente');
        this.load();
        this.isLoading = false;
      },
      error: (err) => {
        console.error('Error eliminando categoría:', err);
        this.toastr.error(err.error?.detail || 'Error al eliminar categoría');
        this.isLoading = false;
      }
    });
  }
}