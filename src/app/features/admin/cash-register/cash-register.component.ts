import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormBuilder, Validators } from '@angular/forms';
import { MatCardModule } from '@angular/material/card';
import { MatButtonModule } from '@angular/material/button';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatIconModule } from '@angular/material/icon';
import { MatTableModule } from '@angular/material/table';
import { MatDividerModule } from '@angular/material/divider';
import { HttpClient } from '@angular/common/http';
import { ToastrService } from 'ngx-toastr';
import { environment } from '../../../../environments/environment';

interface CashSession {
  id: number;
  company_id?: number;
  userId: number;
  openedAt: string;
  closedAt?: string;
  openingAmount: number;
  closingAmount?: number;
  status: 'open' | 'closed';
}

@Component({
  selector: 'app-admin-cash-register',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    MatCardModule,
    MatButtonModule,
    MatFormFieldModule,
    MatInputModule,
    MatIconModule,
    MatTableModule,
    MatDividerModule
  ],
  template: `
  <div style="display:grid; grid-template-columns:1fr 1fr; gap:16px; margin:16px;">
    <!-- Panel de Control de Caja -->
    <mat-card>
      <mat-card-header>
        <mat-card-title>
          <mat-icon style="vertical-align:middle; margin-right:8px;">account_balance_wallet</mat-icon>
          Control de Caja
        </mat-card-title>
        <mat-card-subtitle>Apertura y cierre de turno</mat-card-subtitle>
      </mat-card-header>

      <mat-card-content>
        <!-- Sesión Actual -->
        <div *ngIf="currentSession" style="background:#e3f2fd; padding:16px; border-radius:8px; margin-bottom:16px;">
          <div style="display:flex; justify-content:space-between; align-items:center;">
            <div>
              <div style="font-size:12px; color:#1976d2; font-weight:500;">CAJA ABIERTA</div>
              <div style="font-size:20px; font-weight:600; color:#1976d2; margin-top:4px;">
                \${{currentSession.openingAmount | number:'1.2-2'}}
              </div>
              <div style="font-size:11px; color:#757575; margin-top:4px;">
                Apertura: {{currentSession.openedAt | date:'dd/MM/yyyy HH:mm'}}
              </div>
            </div>
            <mat-icon style="font-size:48px; width:48px; height:48px; color:#1976d2;">monetization_on</mat-icon>
          </div>
        </div>

        <div *ngIf="!currentSession" style="background:#f5f5f5; padding:16px; border-radius:8px; margin-bottom:16px; text-align:center;">
          <mat-icon style="font-size:48px; width:48px; height:48px; color:#757575;">lock</mat-icon>
          <div style="color:#757575; margin-top:8px;">No hay caja abierta</div>
        </div>

        <mat-divider style="margin:16px 0;"></mat-divider>

        <!-- Formulario Apertura -->
        <div *ngIf="!currentSession">
          <h3 style="font-size:14px; font-weight:500; margin-bottom:12px;">Abrir Caja</h3>
          <form [formGroup]="openForm" (ngSubmit)="openCashRegister()">
            <mat-form-field appearance="outline" style="width:100%;">
              <mat-label>Monto de Apertura</mat-label>
              <input matInput type="number" formControlName="openingAmount" placeholder="0.00" step="0.01" />
              <span matPrefix>$&nbsp;</span>
              <mat-error *ngIf="openForm.get('openingAmount')?.hasError('required')">Requerido</mat-error>
              <mat-error *ngIf="openForm.get('openingAmount')?.hasError('min')">Debe ser mayor o igual a 0</mat-error>
            </mat-form-field>

            <button mat-flat-button color="primary" type="submit" [disabled]="openForm.invalid || isLoading" style="width:100%;">
              <mat-icon>lock_open</mat-icon>
              Abrir Caja
            </button>
          </form>
        </div>

        <!-- Formulario Cierre -->
        <div *ngIf="currentSession">
          <h3 style="font-size:14px; font-weight:500; margin-bottom:12px;">Cerrar Caja</h3>
          <form [formGroup]="closeForm" (ngSubmit)="closeCashRegister()">
            <mat-form-field appearance="outline" style="width:100%;">
              <mat-label>Monto de Cierre (Arqueo)</mat-label>
              <input matInput type="number" formControlName="closingAmount" placeholder="0.00" step="0.01" />
              <span matPrefix>$&nbsp;</span>
              <mat-error *ngIf="closeForm.get('closingAmount')?.hasError('required')">Requerido</mat-error>
              <mat-error *ngIf="closeForm.get('closingAmount')?.hasError('min')">Debe ser mayor o igual a 0</mat-error>
            </mat-form-field>

            <div *ngIf="closeForm.value.closingAmount !== null && closeForm.value.closingAmount !== undefined" 
                 style="margin-bottom:12px; padding:12px; border-radius:4px;"
                 [style.background]="getDifferenceColor()"
                 [style.color]="getDifferenceTextColor()">
              <div style="font-size:11px; font-weight:500;">DIFERENCIA</div>
              <div style="font-size:18px; font-weight:600;">
                {{getDifference() >= 0 ? '+' : ''}}${{getDifference() | number:'1.2-2'}}
              </div>
            </div>

            <button mat-flat-button color="warn" type="submit" [disabled]="closeForm.invalid || isLoading" style="width:100%;">
              <mat-icon>lock</mat-icon>
              Cerrar Caja
            </button>
          </form>
        </div>
      </mat-card-content>
    </mat-card>

    <!-- Historial de Sesiones -->
    <mat-card>
      <mat-card-header>
        <mat-card-title>Historial de Sesiones</mat-card-title>
        <mat-card-subtitle>Últimas 50 sesiones</mat-card-subtitle>
      </mat-card-header>

      <mat-card-content>
        <button mat-stroked-button color="primary" (click)="loadSessions()" style="margin-bottom:16px;">
          <mat-icon>refresh</mat-icon>
          Actualizar
        </button>

        <table mat-table [dataSource]="sessions" class="mat-elevation-z2" style="width:100%;">
          <ng-container matColumnDef="openedAt">
            <th mat-header-cell *matHeaderCellDef> Apertura </th>
            <td mat-cell *matCellDef="let s"> {{s.openedAt | date:'dd/MM HH:mm'}} </td>
          </ng-container>

          <ng-container matColumnDef="opening">
            <th mat-header-cell *matHeaderCellDef> Monto Apertura </th>
            <td mat-cell *matCellDef="let s"> \${{s.openingAmount | number:'1.2-2'}} </td>
          </ng-container>

          <ng-container matColumnDef="closing">
            <th mat-header-cell *matHeaderCellDef> Monto Cierre </th>
            <td mat-cell *matCellDef="let s"> 
              {{s.closingAmount !== null && s.closingAmount !== undefined ? ('$' + (s.closingAmount | number:'1.2-2')) : '-'}}
            </td>
          </ng-container>

          <ng-container matColumnDef="status">
            <th mat-header-cell *matHeaderCellDef> Estado </th>
            <td mat-cell *matCellDef="let s">
              <span [style.color]="s.status === 'open' ? '#4caf50' : '#757575'" style="font-weight:500;">
                {{s.status === 'open' ? 'ABIERTA' : 'CERRADA'}}
              </span>
            </td>
          </ng-container>

          <tr mat-header-row *matHeaderRowDef="sessionCols"></tr>
          <tr mat-row *matRowDef="let row; columns: sessionCols;"></tr>
        </table>

        <div *ngIf="sessions.length === 0" style="text-align:center; padding:32px; color:#757575;">
          <mat-icon style="font-size:48px; width:48px; height:48px;">inbox</mat-icon>
          <p>No hay sesiones registradas</p>
        </div>
      </mat-card-content>
    </mat-card>
  </div>
  `,
  styles: [`
    mat-card {
      height: fit-content;
    }
    mat-card-header {
      margin-bottom: 16px;
    }
  `]
})
export class AdminCashRegisterComponent implements OnInit {
  private readonly api = `${environment.apiUrl}/cash-sessions`;
  currentSession: CashSession | null = null;
  sessions: CashSession[] = [];
  isLoading = false;
  sessionCols = ['openedAt', 'opening', 'closing', 'status'];

  openForm = this.fb.group({
    openingAmount: [0, [Validators.required, Validators.min(0)]]
  });

  closeForm = this.fb.group({
    closingAmount: [0, [Validators.required, Validators.min(0)]]
  });

  constructor(
    private fb: FormBuilder,
    private http: HttpClient,
    private toastr: ToastrService
  ) {}

  ngOnInit(): void {
    this.loadCurrentSession();
    this.loadSessions();
  }

  loadCurrentSession(): void {
    this.http.get<{ session: CashSession | null, hasOpenSession: boolean }>(`${this.api}/current`).subscribe({
      next: (data) => {
        this.currentSession = data.session;
      },
      error: (err) => {
        console.error('Error cargando sesión actual:', err);
      }
    });
  }

  loadSessions(): void {
    this.http.get<CashSession[]>(this.api).subscribe({
      next: (data) => {
        this.sessions = data;
      },
      error: (err) => {
        console.error('Error cargando sesiones:', err);
        this.toastr.error('Error al cargar historial');
      }
    });
  }

  openCashRegister(): void {
    if (this.openForm.invalid) return;

    this.isLoading = true;
    const payload = this.openForm.value;

    this.http.post<CashSession>(`${this.api}/open`, payload).subscribe({
      next: (session) => {
        this.toastr.success('Caja abierta exitosamente');
        this.currentSession = session;
        this.openForm.reset({ openingAmount: 0 });
        this.loadSessions();
        this.isLoading = false;
      },
      error: (err) => {
        console.error('Error abriendo caja:', err);
        this.toastr.error(err.error?.detail || 'Error al abrir caja');
        this.isLoading = false;
      }
    });
  }

  closeCashRegister(): void {
    if (this.closeForm.invalid || !this.currentSession) return;

    if (!confirm(`¿Cerrar caja con $${this.closeForm.value.closingAmount}?\n\nDiferencia: $${this.getDifference().toFixed(2)}`)) {
      return;
    }

    this.isLoading = true;
    const payload = this.closeForm.value;

    this.http.post<CashSession>(`${this.api}/${this.currentSession.id}/close`, payload).subscribe({
      next: () => {
        this.toastr.success('Caja cerrada exitosamente');
        this.currentSession = null;
        this.closeForm.reset({ closingAmount: 0 });
        this.loadSessions();
        this.isLoading = false;
      },
      error: (err) => {
        console.error('Error cerrando caja:', err);
        this.toastr.error(err.error?.detail || 'Error al cerrar caja');
        this.isLoading = false;
      }
    });
  }

  getDifference(): number {
    if (!this.currentSession || this.closeForm.value.closingAmount === null) return 0;
    return (this.closeForm.value.closingAmount || 0) - this.currentSession.openingAmount;
  }

  getDifferenceColor(): string {
    const diff = this.getDifference();
    if (diff === 0) return '#e3f2fd';
    if (diff > 0) return '#e8f5e9';
    return '#ffebee';
  }

  getDifferenceTextColor(): string {
    const diff = this.getDifference();
    if (diff === 0) return '#1976d2';
    if (diff > 0) return '#4caf50';
    return '#f44336';
  }
}
