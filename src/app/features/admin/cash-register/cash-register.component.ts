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
  templateUrl: './cash-register.component.html',
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
  openForm: any;
  closeForm: any;

  constructor(
    private fb: FormBuilder,
    private http: HttpClient,
    private toastr: ToastrService
  ) {
    this.openForm = this.fb.group({
      openingAmount: [0, [Validators.required, Validators.min(0)]]
    });

    this.closeForm = this.fb.group({
      closingAmount: [0, [Validators.required, Validators.min(0)]]
    });
  }

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
