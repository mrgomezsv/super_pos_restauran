import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormBuilder, FormGroup, Validators } from '@angular/forms';
import { MatCardModule } from '@angular/material/card';
import { MatTableModule } from '@angular/material/table';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { MatDialogModule, MatDialog } from '@angular/material/dialog';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatTooltipModule } from '@angular/material/tooltip';
import { MatExpansionModule } from '@angular/material/expansion';
import { ToastrService } from 'ngx-toastr';
import { HttpClient } from '@angular/common/http';
import { environment } from '../../../../environments/environment';

interface Account {
  id: number;
  company_id: number;
  code: string;
  name: string;
  accountType: string;
  parentCode?: string;
  level: number;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

@Component({
  selector: 'app-accounting-accounts',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    MatCardModule,
    MatTableModule,
    MatButtonModule,
    MatIconModule,
    MatFormFieldModule,
    MatInputModule,
    MatSelectModule,
    MatDialogModule,
    MatProgressSpinnerModule,
    MatTooltipModule,
    MatExpansionModule
  ],
  template: `
  <mat-card>
    <mat-card-header>
      <mat-card-title>
        <mat-icon style="vertical-align:middle; margin-right:8px;">account_tree</mat-icon>
        Plan de Cuentas
      </mat-card-title>
      <mat-card-subtitle>Gestión del catálogo de cuentas contables</mat-card-subtitle>
    </mat-card-header>

    <mat-card-content>
      <!-- Filtros -->
      <form [formGroup]="filterForm" style="display:flex; gap:12px; margin-bottom:16px; flex-wrap:wrap;">
        <mat-form-field appearance="outline" style="flex:0 0 200px;">
          <mat-label>Tipo de Cuenta</mat-label>
          <mat-select formControlName="accountType">
            <mat-option value="">Todos</mat-option>
            <mat-option value="activo">Activo</mat-option>
            <mat-option value="pasivo">Pasivo</mat-option>
            <mat-option value="patrimonio">Patrimonio</mat-option>
            <mat-option value="ingreso">Ingreso</mat-option>
            <mat-option value="gasto">Gasto</mat-option>
          </mat-select>
        </mat-form-field>

        <button mat-stroked-button color="primary" (click)="loadAccounts()" style="height:56px;">
          <mat-icon>search</mat-icon>
          Buscar
        </button>

        <button mat-stroked-button (click)="clearFilters()" style="height:56px;">
          <mat-icon>clear</mat-icon>
          Limpiar
        </button>
      </form>

      <!-- Formulario de Nueva Cuenta -->
      <mat-expansion-panel [expanded]="showNewAccountForm">
        <mat-expansion-panel-header>
          <mat-panel-title>
            <mat-icon style="vertical-align:middle; margin-right:8px;">add</mat-icon>
            Nueva Cuenta Contable
          </mat-panel-title>
        </mat-expansion-panel-header>

        <form [formGroup]="accountForm" (ngSubmit)="createAccount()" style="display:flex; gap:16px; flex-wrap:wrap; margin:16px 0;">
          <mat-form-field appearance="outline" style="flex:0 0 120px;">
            <mat-label>Código</mat-label>
            <input matInput formControlName="code" placeholder="Ej. 1101" />
            <mat-error *ngIf="accountForm.get('code')?.hasError('required')">El código es requerido</mat-error>
            <mat-error *ngIf="accountForm.get('code')?.hasError('minlength')">Mínimo 2 caracteres</mat-error>
          </mat-form-field>

          <mat-form-field appearance="outline" style="flex:1 1 300px;">
            <mat-label>Nombre de Cuenta</mat-label>
            <input matInput formControlName="name" placeholder="Ej. Caja General" />
            <mat-error *ngIf="accountForm.get('name')?.hasError('required')">El nombre es requerido</mat-error>
            <mat-error *ngIf="accountForm.get('name')?.hasError('minlength')">Mínimo 2 caracteres</mat-error>
          </mat-form-field>

          <mat-form-field appearance="outline" style="flex:0 0 150px;">
            <mat-label>Tipo</mat-label>
            <mat-select formControlName="accountType">
              <mat-option value="activo">Activo</mat-option>
              <mat-option value="pasivo">Pasivo</mat-option>
              <mat-option value="patrimonio">Patrimonio</mat-option>
              <mat-option value="ingreso">Ingreso</mat-option>
              <mat-option value="gasto">Gasto</mat-option>
            </mat-select>
            <mat-error *ngIf="accountForm.get('accountType')?.hasError('required')">El tipo es requerido</mat-error>
          </mat-form-field>

          <mat-form-field appearance="outline" style="flex:0 0 120px;">
            <mat-label>Código Padre</mat-label>
            <input matInput formControlName="parentCode" placeholder="Ej. 11" />
          </mat-form-field>

          <button mat-flat-button color="primary" type="submit" [disabled]="accountForm.invalid || isLoading" style="height:56px;">
            <mat-icon>add</mat-icon>
            Crear Cuenta
          </button>
        </form>
      </mat-expansion-panel>

      <!-- Tabla de Cuentas -->
      <table mat-table [dataSource]="accounts" class="mat-elevation-z2" style="width:100%; margin-top:16px;">
        <ng-container matColumnDef="code">
          <th mat-header-cell *matHeaderCellDef> Código </th>
          <td mat-cell *matCellDef="let account">
            <span [style.padding-left.px]="account.level * 20" style="font-weight:500; color:#1976d2;">
              {{account.code}}
            </span>
          </td>
        </ng-container>

        <ng-container matColumnDef="name">
          <th mat-header-cell *matHeaderCellDef> Nombre </th>
          <td mat-cell *matCellDef="let account">
            <span [style.padding-left.px]="account.level * 20">{{account.name}}</span>
          </td>
        </ng-container>

        <ng-container matColumnDef="accountType">
          <th mat-header-cell *matHeaderCellDef> Tipo </th>
          <td mat-cell *matCellDef="let account">
            <span [style.color]="getAccountTypeColor(account.accountType)" style="font-weight:500;">
              {{getAccountTypeLabel(account.accountType)}}
            </span>
          </td>
        </ng-container>

        <ng-container matColumnDef="level">
          <th mat-header-cell *matHeaderCellDef> Nivel </th>
          <td mat-cell *matCellDef="let account">
            <mat-icon [style.color]="getLevelColor(account.level)">
              {{getLevelIcon(account.level)}}
            </mat-icon>
            {{account.level}}
          </td>
        </ng-container>

        <ng-container matColumnDef="parentCode">
          <th mat-header-cell *matHeaderCellDef> Padre </th>
          <td mat-cell *matCellDef="let account">
            <span *ngIf="account.parentCode" style="color:#757575;">{{account.parentCode}}</span>
            <span *ngIf="!account.parentCode" style="color:#ccc;">-</span>
          </td>
        </ng-container>

        <ng-container matColumnDef="actions">
          <th mat-header-cell *matHeaderCellDef> Acciones </th>
          <td mat-cell *matCellDef="let account">
            <button mat-icon-button color="primary" (click)="editAccount(account)" [disabled]="isLoading" matTooltip="Editar">
              <mat-icon>edit</mat-icon>
            </button>
            <button mat-icon-button color="warn" (click)="deleteAccount(account.id)" [disabled]="isLoading" matTooltip="Eliminar">
              <mat-icon>delete</mat-icon>
            </button>
          </td>
        </ng-container>

        <tr mat-header-row *matHeaderRowDef="displayedColumns"></tr>
        <tr mat-row *matRowDef="let row; columns: displayedColumns;"></tr>
      </table>

      <div *ngIf="accounts.length === 0 && !isLoading" style="text-align:center; padding:48px; color:#757575;">
        <mat-icon style="font-size:64px; width:64px; height:64px;">account_tree</mat-icon>
        <p style="margin-top:16px;">No hay cuentas contables</p>
        <p style="font-size:12px;">Crea tu primera cuenta para comenzar el plan contable</p>
      </div>

      <div *ngIf="isLoading" style="text-align:center; padding:48px;">
        <mat-spinner diameter="40"></mat-spinner>
        <p style="margin-top:16px;">Cargando plan de cuentas...</p>
      </div>

      <!-- Información de Ayuda -->
      <div style="margin-top:16px; padding:12px; background:#f5f5f5; border-radius:4px; font-size:12px;">
        <strong>Tipos de Cuentas:</strong>
        <span style="color:#1976d2;">Activo</span> - Recursos de la empresa |
        <span style="color:#f44336;">Pasivo</span> - Obligaciones |
        <span style="color:#ff9800;">Patrimonio</span> - Capital |
        <span style="color:#4caf50;">Ingreso</span> - Entradas |
        <span style="color:#9c27b0;">Gasto</span> - Salidas
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
    mat-expansion-panel {
      margin-bottom: 16px;
    }
    table {
      margin-top: 16px;
    }
  `]
})
export class AccountingAccountsComponent implements OnInit {
  private readonly api = `${environment.apiUrl}/accounting/accounts`;
  displayedColumns = ['code', 'name', 'accountType', 'level', 'parentCode', 'actions'];
  accounts: Account[] = [];
  isLoading = false;
  showNewAccountForm = false;
  filterForm: FormGroup;
  accountForm: FormGroup;

  constructor(
    private http: HttpClient,
    private toastr: ToastrService,
    private fb: FormBuilder,
    private dialog: MatDialog
  ) {
    this.filterForm = this.fb.group({
      accountType: ['']
    });

    this.accountForm = this.fb.group({
      code: ['', [Validators.required, Validators.minLength(2)]],
      name: ['', [Validators.required, Validators.minLength(2)]],
      accountType: ['', [Validators.required]],
      parentCode: ['']
    });
  }

  ngOnInit(): void {
    this.loadAccounts();
  }

  loadAccounts(): void {
    this.isLoading = true;
    const filters = this.filterForm.value;
    let params: any = {};
    
    if (filters.accountType) params.accountType = filters.accountType;

    this.http.get<Account[]>(this.api, { params }).subscribe({
      next: (data) => {
        this.accounts = data;
        this.isLoading = false;
      },
      error: (err) => {
        console.error('Error cargando cuentas:', err);
        this.toastr.error('Error al cargar plan de cuentas');
        this.isLoading = false;
      }
    });
  }

  clearFilters(): void {
    this.filterForm.reset();
    this.loadAccounts();
  }

  createAccount(): void {
    if (this.accountForm.invalid) return;
    
    this.isLoading = true;
    const payload = {
      code: this.accountForm.value.code.trim(),
      name: this.accountForm.value.name.trim(),
      accountType: this.accountForm.value.accountType,
      parentCode: this.accountForm.value.parentCode?.trim() || null
    };

    this.http.post<Account>(this.api, payload).subscribe({
      next: () => {
        this.toastr.success('Cuenta creada exitosamente');
        this.accountForm.reset();
        this.showNewAccountForm = false;
        this.loadAccounts();
        this.isLoading = false;
      },
      error: (err) => {
        console.error('Error creando cuenta:', err);
        this.toastr.error(err.error?.detail || 'Error al crear cuenta');
        this.isLoading = false;
      }
    });
  }

  editAccount(account: Account): void {
    // TODO: Implementar diálogo de edición
    this.toastr.info('Función de edición próximamente');
  }

  deleteAccount(id: number): void {
    if (!confirm('¿Eliminar esta cuenta?\n\nNota: No se puede eliminar si tiene movimientos contables o cuentas hijas.')) return;
    
    this.isLoading = true;
    this.http.delete(`${this.api}/${id}`).subscribe({
      next: () => {
        this.toastr.success('Cuenta eliminada exitosamente');
        this.loadAccounts();
        this.isLoading = false;
      },
      error: (err) => {
        console.error('Error eliminando cuenta:', err);
        this.toastr.error(err.error?.detail || 'Error al eliminar cuenta');
        this.isLoading = false;
      }
    });
  }

  getAccountTypeLabel(type: string): string {
    const labels: { [key: string]: string } = {
      'activo': 'Activo',
      'pasivo': 'Pasivo',
      'patrimonio': 'Patrimonio',
      'ingreso': 'Ingreso',
      'gasto': 'Gasto'
    };
    return labels[type] || type;
  }

  getAccountTypeColor(type: string): string {
    const colors: { [key: string]: string } = {
      'activo': '#1976d2',
      'pasivo': '#f44336',
      'patrimonio': '#ff9800',
      'ingreso': '#4caf50',
      'gasto': '#9c27b0'
    };
    return colors[type] || '#757575';
  }

  getLevelColor(level: number): string {
    if (level <= 1) return '#1976d2';
    if (level <= 2) return '#4caf50';
    if (level <= 3) return '#ff9800';
    return '#f44336';
  }

  getLevelIcon(level: number): string {
    if (level <= 1) return 'account_tree';
    if (level <= 2) return 'folder';
    if (level <= 3) return 'folder_open';
    return 'description';
  }
}
