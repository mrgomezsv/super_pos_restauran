import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormBuilder, Validators } from '@angular/forms';
import { MatCardModule } from '@angular/material/card';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatTableModule } from '@angular/material/table';
import { ToastrService } from 'ngx-toastr';

@Component({
  selector: 'app-admin-categories',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    MatCardModule,
    MatButtonModule,
    MatIconModule,
    MatFormFieldModule,
    MatInputModule,
    MatTableModule
  ],
  template: `
  <mat-card>
    <mat-card-title>Categorías</mat-card-title>
    <mat-card-subtitle>Administración de categorías de productos</mat-card-subtitle>

    <form [formGroup]="form" (ngSubmit)="create()" style="display:flex; gap:16px; align-items:flex-end; margin:16px 0;">
      <mat-form-field appearance="outline" style="flex:2;">
        <mat-label>Nombre</mat-label>
        <input matInput formControlName="name" placeholder="Ej. Bebidas" />
      </mat-form-field>
      <mat-form-field appearance="outline" style="flex:3;">
        <mat-label>Descripción</mat-label>
        <input matInput formControlName="description" placeholder="Descripción opcional" />
      </mat-form-field>
      <button mat-flat-button color="primary" type="submit" [disabled]="form.invalid">Crear</button>
    </form>

    <table mat-table [dataSource]="categories" class="mat-elevation-z1" style="width:100%;">
      <ng-container matColumnDef="name">
        <th mat-header-cell *matHeaderCellDef> Nombre </th>
        <td mat-cell *matCellDef="let c"> {{c.name}} </td>
      </ng-container>

      <ng-container matColumnDef="description">
        <th mat-header-cell *matHeaderCellDef> Descripción </th>
        <td mat-cell *matCellDef="let c"> {{c.description || '-'}} </td>
      </ng-container>

      <tr mat-header-row *matHeaderRowDef="displayedColumns"></tr>
      <tr mat-row *matRowDef="let row; columns: displayedColumns;"></tr>
    </table>
  </mat-card>
  `
})
export class AdminCategoriesComponent implements OnInit {
  displayedColumns = ['name', 'description'];
  categories: any[] = [];
  form = this.fb.group({
    name: ['', [Validators.required, Validators.minLength(2)]],
    description: ['']
  });

  constructor(private fb: FormBuilder, private toastr: ToastrService) {}

  ngOnInit(): void {
    // placeholder: en implementación final, consumir ProductService.getCategories()
    this.categories = [];
  }

  create(): void {
    if (this.form.invalid) return;
    const payload = this.form.value;
    // placeholder: usar ProductService.createCategory(payload)
    this.categories = [...this.categories, payload];
    this.form.reset();
    this.toastr.success('Categoría creada');
  }
}


