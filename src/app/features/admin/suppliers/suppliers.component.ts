import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormBuilder, Validators } from '@angular/forms';
import { MatCardModule } from '@angular/material/card';
import { MatButtonModule } from '@angular/material/button';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatTableModule } from '@angular/material/table';
import { ToastrService } from 'ngx-toastr';
import { HttpClient } from '@angular/common/http';
import { environment } from '../../../../environments/environment';

@Component({
  selector: 'app-admin-suppliers',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, MatCardModule, MatButtonModule, MatFormFieldModule, MatInputModule, MatTableModule],
  template: `
  <mat-card>
    <mat-card-title>Proveedores</mat-card-title>
    <mat-card-subtitle>Gestión de proveedores (para compras futuras y control fiscal)</mat-card-subtitle>

    <form [formGroup]="form" (ngSubmit)="create()" style="display:flex; gap:16px; flex-wrap:wrap; margin:16px 0;">
      <mat-form-field appearance="outline" style="flex:1 1 220px;">
        <mat-label>Nombre</mat-label>
        <input matInput formControlName="name" />
      </mat-form-field>
      <mat-form-field appearance="outline" style="flex:1 1 180px;">
        <mat-label>NRC / NIT</mat-label>
        <input matInput formControlName="taxId" />
      </mat-form-field>
      <mat-form-field appearance="outline" style="flex:1 1 260px;">
        <mat-label>Email</mat-label>
        <input matInput formControlName="email" />
      </mat-form-field>
      <button mat-flat-button color="primary" type="submit" [disabled]="form.invalid">Agregar</button>
    </form>

    <table mat-table [dataSource]="suppliers" class="mat-elevation-z1" style="width:100%;">
      <ng-container matColumnDef="name"><th mat-header-cell *matHeaderCellDef>Nombre</th><td mat-cell *matCellDef="let s">{{s.name}}</td></ng-container>
      <ng-container matColumnDef="taxId"><th mat-header-cell *matHeaderCellDef>NRC/NIT</th><td mat-cell *matCellDef="let s">{{s.taxId}}</td></ng-container>
      <ng-container matColumnDef="email"><th mat-header-cell *matHeaderCellDef>Email</th><td mat-cell *matCellDef="let s">{{s.email || '-'}}</td></ng-container>
      <tr mat-header-row *matHeaderRowDef="cols"></tr>
      <tr mat-row *matRowDef="let row; columns: cols;"></tr>
    </table>
  </mat-card>
  `
})
export class AdminSuppliersComponent implements OnInit {
  cols = ['name', 'taxId', 'email'];
  suppliers: any[] = [];
  form: any;
  private readonly api = `${environment.apiUrl}/suppliers`;
  
  constructor(private fb: FormBuilder, private toastr: ToastrService, private http: HttpClient) {
    this.form = this.fb.group({ 
      name: ['', Validators.required], 
      taxId: [''], 
      email: [''] 
    });
  }
  ngOnInit(){ this.load(); }
  load(){ this.http.get<any[]>(this.api).subscribe(rows=> this.suppliers = rows); }
  create(){
    if(this.form.invalid) return;
    this.http.post(this.api, this.form.value).subscribe(()=>{ this.toastr.success('Proveedor agregado'); this.form.reset(); this.load(); });
  }
}


