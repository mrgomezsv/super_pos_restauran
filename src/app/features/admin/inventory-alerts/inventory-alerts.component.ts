import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatCardModule } from '@angular/material/card';
import { MatTableModule } from '@angular/material/table';

@Component({
  selector: 'app-admin-inventory-alerts',
  standalone: true,
  imports: [CommonModule, MatCardModule, MatTableModule],
  template: `
  <mat-card>
    <mat-card-title>Alertas de Inventario</mat-card-title>
    <mat-card-subtitle>Productos bajo mínimo</mat-card-subtitle>
    <table mat-table [dataSource]="rows" style="width:100%;" class="mat-elevation-z1">
      <ng-container matColumnDef="code"><th mat-header-cell *matHeaderCellDef>Código</th><td mat-cell *matCellDef="let r">{{r.code}}</td></ng-container>
      <ng-container matColumnDef="name"><th mat-header-cell *matHeaderCellDef>Producto</th><td mat-cell *matCellDef="let r">{{r.name}}</td></ng-container>
      <ng-container matColumnDef="stock"><th mat-header-cell *matHeaderCellDef>Stock</th><td mat-cell *matCellDef="let r">{{r.stock}}</td></ng-container>
      <ng-container matColumnDef="min"><th mat-header-cell *matHeaderCellDef>Mínimo</th><td mat-cell *matCellDef="let r">{{r.minStock}}</td></ng-container>
      <tr mat-header-row *matHeaderRowDef="cols"></tr>
      <tr mat-row *matRowDef="let row; columns: cols;"></tr>
    </table>
  </mat-card>
  `
})
export class AdminInventoryAlertsComponent {
  cols = ['code', 'name', 'stock', 'min'];
  rows: any[] = [];
}


