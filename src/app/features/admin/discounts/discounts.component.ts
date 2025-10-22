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
  template: `
  <mat-card>
    <mat-card-header>
      <mat-card-title>Promociones / Descuentos</mat-card-title>
      <mat-card-subtitle>Configura reglas de descuento para aplicar en ventas</mat-card-subtitle>
    </mat-card-header>
    
    <mat-card-content>
      <form [formGroup]="form" (ngSubmit)="create()" style="display:flex; gap:16px; flex-wrap:wrap; margin:24px 0;">
        <mat-form-field appearance="outline" style="flex:1 1 200px;">
          <mat-label>Nombre del Descuento</mat-label>
          <input matInput formControlName="name" placeholder="Ej. Descuento Mayorista" />
          <mat-error *ngIf="form.get('name')?.hasError('required')">El nombre es requerido</mat-error>
        </mat-form-field>
        
        <mat-form-field appearance="outline" style="flex:0 0 150px;">
          <mat-label>% Descuento</mat-label>
          <input type="number" matInput formControlName="percent" placeholder="0-100" min="0" max="100" />
          <mat-error *ngIf="form.get('percent')?.hasError('required')">Requerido</mat-error>
          <mat-error *ngIf="form.get('percent')?.hasError('min')">Mínimo 0%</mat-error>
          <mat-error *ngIf="form.get('percent')?.hasError('max')">Máximo 100%</mat-error>
        </mat-form-field>
        
        <button mat-flat-button color="primary" type="submit" [disabled]="form.invalid || isLoading">
          <mat-icon>add</mat-icon>
          Crear Descuento
        </button>
      </form>

      <table mat-table [dataSource]="discounts" class="mat-elevation-z2" style="width:100%;">
        <ng-container matColumnDef="name">
          <th mat-header-cell *matHeaderCellDef> Nombre </th>
          <td mat-cell *matCellDef="let d"> {{d.name}} </td>
        </ng-container>

        <ng-container matColumnDef="percent">
          <th mat-header-cell *matHeaderCellDef> Descuento </th>
          <td mat-cell *matCellDef="let d"> 
            <span style="font-weight:500; color:#1976d2;">{{d.percent}}%</span>
          </td>
        </ng-container>

        <ng-container matColumnDef="isActive">
          <th mat-header-cell *matHeaderCellDef> Estado </th>
          <td mat-cell *matCellDef="let d">
            <span [style.color]="d.isActive ? '#4caf50' : '#757575'">
              {{d.isActive ? 'Activo' : 'Inactivo'}}
            </span>
          </td>
        </ng-container>

        <ng-container matColumnDef="actions">
          <th mat-header-cell *matHeaderCellDef> Acciones </th>
          <td mat-cell *matCellDef="let d">
            <button mat-icon-button color="warn" (click)="delete(d.id)" [disabled]="isLoading">
              <mat-icon>delete</mat-icon>
            </button>
          </td>
        </ng-container>

        <tr mat-header-row *matHeaderRowDef="displayedColumns"></tr>
        <tr mat-row *matRowDef="let row; columns: displayedColumns;"></tr>
      </table>

      <div *ngIf="discounts.length === 0" style="text-align:center; padding:32px; color:#757575;">
        <mat-icon style="font-size:48px; width:48px; height:48px;">local_offer</mat-icon>
        <p>No hay descuentos configurados</p>
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
