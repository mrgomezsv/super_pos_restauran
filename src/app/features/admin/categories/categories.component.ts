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
  template: `
  <mat-card>
    <mat-card-header>
      <mat-card-title>
        <mat-icon style="vertical-align:middle; margin-right:8px;">category</mat-icon>
        Gestión de Categorías
      </mat-card-title>
      <mat-card-subtitle>Administra las categorías de productos</mat-card-subtitle>
    </mat-card-header>
    
    <mat-card-content>
      <form [formGroup]="form" (ngSubmit)="create()" style="display:flex; gap:16px; flex-wrap:wrap; margin:24px 0;">
        <mat-form-field appearance="outline" style="flex:1 1 200px;">
          <mat-label>Nombre de Categoría</mat-label>
          <input matInput formControlName="name" placeholder="Ej. Electrónicos" />
          <mat-error *ngIf="form.get('name')?.hasError('required')">El nombre es requerido</mat-error>
          <mat-error *ngIf="form.get('name')?.hasError('minlength')">Mínimo 2 caracteres</mat-error>
        </mat-form-field>
        
        <mat-form-field appearance="outline" style="flex:1 1 300px;">
          <mat-label>Descripción (Opcional)</mat-label>
          <input matInput formControlName="description" placeholder="Descripción de la categoría" />
        </mat-form-field>
        
        <button mat-flat-button color="primary" type="submit" [disabled]="form.invalid || isLoading">
          <mat-icon>add</mat-icon>
          Crear Categoría
        </button>
      </form>

      <table mat-table [dataSource]="categories" class="mat-elevation-z2" style="width:100%;">
        <ng-container matColumnDef="name">
          <th mat-header-cell *matHeaderCellDef> Nombre </th>
          <td mat-cell *matCellDef="let c"> 
            <div style="font-weight:500;">{{c.name}}</div>
            <div style="font-size:11px; color:#757575;">Creada: {{c.createdAt | date:'dd/MM/yyyy'}}</div>
          </td>
        </ng-container>

        <ng-container matColumnDef="description">
          <th mat-header-cell *matHeaderCellDef> Descripción </th>
          <td mat-cell *matCellDef="let c"> 
            <span style="font-size:13px;">{{c.description || '-'}}</span>
          </td>
        </ng-container>

        <ng-container matColumnDef="actions">
          <th mat-header-cell *matHeaderCellDef> Acciones </th>
          <td mat-cell *matCellDef="let c">
            <button mat-icon-button color="primary" (click)="edit(c)" [disabled]="isLoading" matTooltip="Editar">
              <mat-icon>edit</mat-icon>
            </button>
            <button mat-icon-button color="warn" (click)="delete(c.id)" [disabled]="isLoading" matTooltip="Eliminar">
              <mat-icon>delete</mat-icon>
            </button>
          </td>
        </ng-container>

        <tr mat-header-row *matHeaderRowDef="displayedColumns"></tr>
        <tr mat-row *matRowDef="let row; columns: displayedColumns;"></tr>
      </table>

      <div *ngIf="categories.length === 0" style="text-align:center; padding:32px; color:#757575;">
        <mat-icon style="font-size:48px; width:48px; height:48px;">category</mat-icon>
        <p>No hay categorías creadas</p>
        <p style="font-size:12px;">Crea tu primera categoría para organizar los productos</p>
      </div>
    </mat-card-content>
  </mat-card>
  `,
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