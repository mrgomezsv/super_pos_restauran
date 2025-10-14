import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormBuilder, Validators } from '@angular/forms';
import { MatCardModule } from '@angular/material/card';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatButtonModule } from '@angular/material/button';

@Component({
  selector: 'app-admin-discounts',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, MatCardModule, MatFormFieldModule, MatInputModule, MatButtonModule],
  template: `
  <mat-card>
    <mat-card-title>Promociones / Descuentos</mat-card-title>
    <mat-card-subtitle>Configura reglas de descuento</mat-card-subtitle>
    <form [formGroup]="form" (ngSubmit)="save()" style="display:flex; gap:12px; flex-wrap:wrap; margin-top:12px;">
      <mat-form-field appearance="outline"><mat-label>Nombre</mat-label><input matInput formControlName="name" /></mat-form-field>
      <mat-form-field appearance="outline"><mat-label>% Descuento</mat-label><input type="number" matInput formControlName="percent" /></mat-form-field>
      <button mat-flat-button color="primary" type="submit" [disabled]="form.invalid">Guardar</button>
    </form>
  </mat-card>
  `
})
export class AdminDiscountsComponent {
  form = this.fb.group({ name: ['', Validators.required], percent: [0, [Validators.required, Validators.min(0), Validators.max(100)]] });
  constructor(private fb: FormBuilder) {}
  save(){ /* integrar con reglas de pricing */ }
}


