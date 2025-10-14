import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatCardModule } from '@angular/material/card';
import { MatTableModule } from '@angular/material/table';

@Component({
  selector: 'app-admin-audit-logs',
  standalone: true,
  imports: [CommonModule, MatCardModule, MatTableModule],
  template: `
  <mat-card>
    <mat-card-title>Bitácora</mat-card-title>
    <mat-card-subtitle>Eventos de auditoría por usuario y módulo</mat-card-subtitle>
    <table mat-table [dataSource]="rows" class="mat-elevation-z1" style="width:100%;">
      <ng-container matColumnDef="date"><th mat-header-cell *matHeaderCellDef>Fecha</th><td mat-cell *matCellDef="let r">{{r.date | date:'short'}}</td></ng-container>
      <ng-container matColumnDef="user"><th mat-header-cell *matHeaderCellDef>Usuario</th><td mat-cell *matCellDef="let r">{{r.user}}</td></ng-container>
      <ng-container matColumnDef="action"><th mat-header-cell *matHeaderCellDef>Acción</th><td mat-cell *matCellDef="let r">{{r.action}}</td></ng-container>
      <ng-container matColumnDef="module"><th mat-header-cell *matHeaderCellDef>Módulo</th><td mat-cell *matCellDef="let r">{{r.module}}</td></ng-container>
      <tr mat-header-row *matHeaderRowDef="cols"></tr>
      <tr mat-row *matRowDef="let row; columns: cols;"></tr>
    </table>
  </mat-card>
  `
})
export class AdminAuditLogsComponent {
  cols = ['date', 'user', 'action', 'module'];
  rows: any[] = [];
}


