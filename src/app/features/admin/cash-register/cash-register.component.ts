import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatCardModule } from '@angular/material/card';
import { MatButtonModule } from '@angular/material/button';

@Component({
  selector: 'app-admin-cash-register',
  standalone: true,
  imports: [CommonModule, MatCardModule, MatButtonModule],
  template: `
  <mat-card>
    <mat-card-title>Caja Registradora</mat-card-title>
    <mat-card-subtitle>Apertura y cierre de caja por turno</mat-card-subtitle>
    <div style="display:flex; gap:12px; margin-top:12px;">
      <button mat-stroked-button color="primary">Abrir Caja</button>
      <button mat-stroked-button color="warn">Cerrar Caja</button>
    </div>
  </mat-card>
  `
})
export class AdminCashRegisterComponent {}


