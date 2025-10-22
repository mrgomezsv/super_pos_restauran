import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormBuilder, FormGroup, Validators } from '@angular/forms';
import { MatCardModule } from '@angular/material/card';
import { MatTableModule } from '@angular/material/table';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatDatepickerModule } from '@angular/material/datepicker';
import { MatDialogModule, MatDialog } from '@angular/material/dialog';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatTooltipModule } from '@angular/material/tooltip';
import { ToastrService } from 'ngx-toastr';
import { HttpClient } from '@angular/common/http';
import { environment } from '../../../../environments/environment';

interface JournalEntry {
  id: number;
  company_id: number;
  entryNumber: number;
  date: string;
  description: string;
  reference?: string;
  totalDebit: number;
  totalCredit: number;
  createdAt: string;
  lines: JournalLine[];
}

interface JournalLine {
  id: number;
  journalEntryId: number;
  accountCode: string;
  accountName: string;
  description?: string;
  debit: number;
  credit: number;
}

@Component({
  selector: 'app-accounting-diario',
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
    MatDatepickerModule,
    MatDialogModule,
    MatProgressSpinnerModule,
    MatTooltipModule
  ],
  template: `
  <mat-card>
    <mat-card-header>
      <mat-card-title>
        <mat-icon style="vertical-align:middle; margin-right:8px;">book</mat-icon>
        Diario Contable
      </mat-card-title>
      <mat-card-subtitle>Registro cronológico de asientos contables</mat-card-subtitle>
    </mat-card-header>

    <mat-card-content>
      <!-- Filtros -->
      <form [formGroup]="filterForm" style="display:flex; gap:12px; margin-bottom:16px; flex-wrap:wrap;">
        <mat-form-field appearance="outline" style="flex:0 0 150px;">
          <mat-label>Fecha Inicio</mat-label>
          <input matInput type="date" formControlName="startDate" />
        </mat-form-field>

        <mat-form-field appearance="outline" style="flex:0 0 150px;">
          <mat-label>Fecha Fin</mat-label>
          <input matInput type="date" formControlName="endDate" />
        </mat-form-field>

        <mat-form-field appearance="outline" style="flex:0 0 120px;">
          <mat-label>Código Cuenta</mat-label>
          <input matInput formControlName="accountCode" placeholder="Ej. 1101" />
        </mat-form-field>

        <button mat-stroked-button color="primary" (click)="loadEntries()" style="height:56px;">
          <mat-icon>search</mat-icon>
          Buscar
        </button>

        <button mat-stroked-button (click)="clearFilters()" style="height:56px;">
          <mat-icon>clear</mat-icon>
          Limpiar
        </button>
      </form>

      <!-- Tabla de Asientos -->
      <table mat-table [dataSource]="entries" class="mat-elevation-z2" style="width:100%;">
        <ng-container matColumnDef="entryNumber">
          <th mat-header-cell *matHeaderCellDef> # Asiento </th>
          <td mat-cell *matCellDef="let entry"> 
            <span style="font-weight:500; color:#1976d2;">{{entry.entryNumber}}</span>
          </td>
        </ng-container>

        <ng-container matColumnDef="date">
          <th mat-header-cell *matHeaderCellDef> Fecha </th>
          <td mat-cell *matCellDef="let entry"> {{entry.date | date:'dd/MM/yyyy'}} </td>
        </ng-container>

        <ng-container matColumnDef="description">
          <th mat-header-cell *matHeaderCellDef> Descripción </th>
          <td mat-cell *matCellDef="let entry"> 
            <div style="font-weight:500;">{{entry.description}}</div>
            <div style="font-size:11px; color:#757575;" *ngIf="entry.reference">Ref: {{entry.reference}}</div>
          </td>
        </ng-container>

        <ng-container matColumnDef="totals">
          <th mat-header-cell *matHeaderCellDef> Totales </th>
          <td mat-cell *matCellDef="let entry">
            <div style="text-align:right;">
              <div style="font-size:12px; color:#757575;">Débito: \${{entry.totalDebit | number:'1.2-2'}}</div>
              <div style="font-size:12px; color:#757575;">Crédito: \${{entry.totalCredit | number:'1.2-2'}}</div>
            </div>
          </td>
        </ng-container>

        <ng-container matColumnDef="actions">
          <th mat-header-cell *matHeaderCellDef> Acciones </th>
          <td mat-cell *matCellDef="let entry">
            <button mat-icon-button color="primary" (click)="viewDetails(entry)" matTooltip="Ver Detalle">
              <mat-icon>visibility</mat-icon>
            </button>
          </td>
        </ng-container>

        <tr mat-header-row *matHeaderRowDef="displayedColumns"></tr>
        <tr mat-row *matRowDef="let row; columns: displayedColumns;"></tr>
      </table>

      <div *ngIf="entries.length === 0 && !isLoading" style="text-align:center; padding:48px; color:#757575;">
        <mat-icon style="font-size:64px; width:64px; height:64px;">book</mat-icon>
        <p style="margin-top:16px;">No hay asientos contables</p>
        <p style="font-size:12px;">Los asientos aparecerán aquí cuando se registren transacciones</p>
      </div>

      <div *ngIf="isLoading" style="text-align:center; padding:48px;">
        <mat-spinner diameter="40"></mat-spinner>
        <p style="margin-top:16px;">Cargando asientos contables...</p>
      </div>

      <div style="margin-top:12px; font-size:12px; color:#757575; text-align:right;">
        Mostrando últimos 100 asientos
      </div>
    </mat-card-content>
  </mat-card>

  <!-- Modal de Detalle -->
  <div *ngIf="selectedEntry" class="modal-overlay" (click)="closeModal()">
    <div class="modal-content" (click)="$event.stopPropagation()">
      <div class="modal-header">
        <h3>Asiento Contable #{{selectedEntry.entryNumber}}</h3>
        <button mat-icon-button (click)="closeModal()">
          <mat-icon>close</mat-icon>
        </button>
      </div>
      
      <div class="modal-body">
        <div style="margin-bottom:16px;">
          <strong>Fecha:</strong> {{selectedEntry.date | date:'dd/MM/yyyy'}}<br>
          <strong>Descripción:</strong> {{selectedEntry.description}}<br>
          <strong *ngIf="selectedEntry.reference">Referencia:</strong> {{selectedEntry.reference}}
        </div>

        <table mat-table [dataSource]="selectedEntry.lines" style="width:100%;">
          <ng-container matColumnDef="accountCode">
            <th mat-header-cell *matHeaderCellDef> Código </th>
            <td mat-cell *matCellDef="let line"> {{line.accountCode}} </td>
          </ng-container>

          <ng-container matColumnDef="accountName">
            <th mat-header-cell *matHeaderCellDef> Cuenta </th>
            <td mat-cell *matCellDef="let line"> {{line.accountName}} </td>
          </ng-container>

          <ng-container matColumnDef="description">
            <th mat-header-cell *matHeaderCellDef> Descripción </th>
            <td mat-cell *matCellDef="let line"> {{line.description || '-'}} </td>
          </ng-container>

          <ng-container matColumnDef="debit">
            <th mat-header-cell *matHeaderCellDef> Débito </th>
            <td mat-cell *matCellDef="let line" style="text-align:right;">
              <span *ngIf="line.debit > 0">\${{line.debit | number:'1.2-2'}}</span>
            </td>
          </ng-container>

          <ng-container matColumnDef="credit">
            <th mat-header-cell *matHeaderCellDef> Crédito </th>
            <td mat-cell *matCellDef="let line" style="text-align:right;">
              <span *ngIf="line.credit > 0">\${{line.credit | number:'1.2-2'}}</span>
            </td>
          </ng-container>

          <tr mat-header-row *matHeaderRowDef="detailColumns"></tr>
          <tr mat-row *matRowDef="let row; columns: detailColumns;"></tr>
        </table>

        <div style="margin-top:16px; padding:12px; background:#f5f5f5; border-radius:4px;">
          <div style="display:flex; justify-content:space-between;">
            <span><strong>Total Débito:</strong></span>
            <span><strong>\${{selectedEntry.totalDebit | number:'1.2-2'}}</strong></span>
          </div>
          <div style="display:flex; justify-content:space-between;">
            <span><strong>Total Crédito:</strong></span>
            <span><strong>\${{selectedEntry.totalCredit | number:'1.2-2'}}</strong></span>
          </div>
        </div>
      </div>
    </div>
  </div>
  `,
  styles: [`
    mat-card {
      margin: 16px;
    }
    mat-card-header {
      margin-bottom: 16px;
    }
    .modal-overlay {
      position: fixed;
      top: 0;
      left: 0;
      width: 100%;
      height: 100%;
      background: rgba(0,0,0,0.5);
      display: flex;
      justify-content: center;
      align-items: center;
      z-index: 1000;
    }
    .modal-content {
      background: white;
      border-radius: 8px;
      max-width: 800px;
      width: 90%;
      max-height: 80%;
      overflow-y: auto;
    }
    .modal-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      padding: 16px;
      border-bottom: 1px solid #e0e0e0;
    }
    .modal-body {
      padding: 16px;
    }
  `]
})
export class AccountingDiarioComponent implements OnInit {
  private readonly api = `${environment.apiUrl}/accounting/journal-entries`;
  displayedColumns = ['entryNumber', 'date', 'description', 'totals', 'actions'];
  detailColumns = ['accountCode', 'accountName', 'description', 'debit', 'credit'];
  entries: JournalEntry[] = [];
  selectedEntry: JournalEntry | null = null;
  isLoading = false;
  filterForm: FormGroup;

  constructor(
    private http: HttpClient,
    private toastr: ToastrService,
    private fb: FormBuilder,
    private dialog: MatDialog
  ) {
    this.filterForm = this.fb.group({
      startDate: [''],
      endDate: [''],
      accountCode: ['']
    });
  }

  ngOnInit(): void {
    this.loadEntries();
  }

  loadEntries(): void {
    this.isLoading = true;
    const filters = this.filterForm.value;
    let params: any = {};
    
    if (filters.startDate) params.startDate = filters.startDate;
    if (filters.endDate) params.endDate = filters.endDate;
    if (filters.accountCode) params.accountCode = filters.accountCode;

    this.http.get<JournalEntry[]>(this.api, { params }).subscribe({
      next: (data) => {
        this.entries = data;
        this.isLoading = false;
      },
      error: (err) => {
        console.error('Error cargando asientos:', err);
        this.toastr.error('Error al cargar asientos contables');
        this.isLoading = false;
      }
    });
  }

  clearFilters(): void {
    this.filterForm.reset();
    this.loadEntries();
  }

  viewDetails(entry: JournalEntry): void {
    this.http.get<JournalEntry>(`${this.api}/${entry.id}`).subscribe({
      next: (data) => {
        this.selectedEntry = data;
      },
      error: (err) => {
        console.error('Error cargando detalle:', err);
        this.toastr.error('Error al cargar detalle del asiento');
      }
    });
  }

  closeModal(): void {
    this.selectedEntry = null;
  }
}