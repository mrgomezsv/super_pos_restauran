import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormBuilder, FormGroup } from '@angular/forms';
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
import { MatExpansionModule } from '@angular/material/expansion';
import { ToastrService } from 'ngx-toastr';
import { HttpClient } from '@angular/common/http';
import { environment } from '../../../../environments/environment';

interface LedgerEntry {
  accountCode: string;
  accountName: string;
  movements: LedgerMovement[];
  totalDebit: number;
  totalCredit: number;
  balance: number;
}

interface LedgerMovement {
  date: string;
  entryNumber: number;
  description: string;
  debit: number;
  credit: number;
}

@Component({
  selector: 'app-accounting-mayor',
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
    MatTooltipModule,
    MatExpansionModule
  ],
  template: `
  <mat-card>
    <mat-card-header>
      <mat-card-title>
        <mat-icon style="vertical-align:middle; margin-right:8px;">account_balance</mat-icon>
        Mayor Contable
      </mat-card-title>
      <mat-card-subtitle>Movimientos agrupados por cuenta contable</mat-card-subtitle>
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

        <button mat-stroked-button color="primary" (click)="loadLedger()" style="height:56px;">
          <mat-icon>search</mat-icon>
          Buscar
        </button>

        <button mat-stroked-button (click)="clearFilters()" style="height:56px;">
          <mat-icon>clear</mat-icon>
          Limpiar
        </button>
      </form>

      <!-- Resumen de Totales -->
      <div *ngIf="ledgerEntries.length > 0" style="margin-bottom:16px; padding:12px; background:#f5f5f5; border-radius:4px;">
        <div style="display:flex; justify-content:space-between; align-items:center;">
          <div>
            <strong>Cuentas con Movimientos:</strong> {{ledgerEntries.length}}
          </div>
          <div style="display:flex; gap:24px;">
            <div>
              <strong>Total Débitos:</strong> \${{totalDebits | number:'1.2-2'}}
            </div>
            <div>
              <strong>Total Créditos:</strong> \${{totalCredits | number:'1.2-2'}}
            </div>
            <div [style.color]="isBalanced ? 'green' : 'red'">
              <strong>Diferencia:</strong> \${{(totalDebits - totalCredits) | number:'1.2-2'}}
            </div>
          </div>
        </div>
      </div>

      <!-- Lista de Cuentas -->
      <mat-accordion *ngIf="ledgerEntries.length > 0">
        <mat-expansion-panel *ngFor="let entry of ledgerEntries" [expanded]="false">
          <mat-expansion-panel-header>
            <mat-panel-title>
              <div style="display:flex; justify-content:space-between; width:100%;">
                <div>
                  <span style="font-weight:500;">{{entry.accountCode}} - {{entry.accountName}}</span>
                </div>
                <div style="display:flex; gap:16px; font-size:12px;">
                  <span>D: \${{entry.totalDebit | number:'1.2-2'}}</span>
                  <span>C: \${{entry.totalCredit | number:'1.2-2'}}</span>
                  <span [style.color]="entry.balance >= 0 ? 'green' : 'red'">
                    S: \${{entry.balance | number:'1.2-2'}}
                  </span>
                </div>
              </div>
            </mat-panel-title>
          </mat-expansion-panel-header>

          <!-- Tabla de Movimientos -->
          <table mat-table [dataSource]="entry.movements" style="width:100%;">
            <ng-container matColumnDef="date">
              <th mat-header-cell *matHeaderCellDef> Fecha </th>
              <td mat-cell *matCellDef="let movement"> {{movement.date | date:'dd/MM/yyyy'}} </td>
            </ng-container>

            <ng-container matColumnDef="entryNumber">
              <th mat-header-cell *matHeaderCellDef> # Asiento </th>
              <td mat-cell *matCellDef="let movement"> 
                <span style="color:#1976d2;">{{movement.entryNumber}}</span>
              </td>
            </ng-container>

            <ng-container matColumnDef="description">
              <th mat-header-cell *matHeaderCellDef> Descripción </th>
              <td mat-cell *matCellDef="let movement"> {{movement.description}} </td>
            </ng-container>

            <ng-container matColumnDef="debit">
              <th mat-header-cell *matHeaderCellDef> Débito </th>
              <td mat-cell *matCellDef="let movement" style="text-align:right;">
                <span *ngIf="movement.debit > 0">\${{movement.debit | number:'1.2-2'}}</span>
              </td>
            </ng-container>

            <ng-container matColumnDef="credit">
              <th mat-header-cell *matHeaderCellDef> Crédito </th>
              <td mat-cell *matCellDef="let movement" style="text-align:right;">
                <span *ngIf="movement.credit > 0">\${{movement.credit | number:'1.2-2'}}</span>
              </td>
            </ng-container>

            <tr mat-header-row *matHeaderRowDef="movementColumns"></tr>
            <tr mat-row *matRowDef="let row; columns: movementColumns;"></tr>
          </table>

          <!-- Totales de la Cuenta -->
          <div style="margin-top:12px; padding:8px; background:#e3f2fd; border-radius:4px;">
            <div style="display:flex; justify-content:space-between; font-weight:500;">
              <span>Totales de {{entry.accountCode}}:</span>
              <div style="display:flex; gap:16px;">
                <span>Débito: \${{entry.totalDebit | number:'1.2-2'}}</span>
                <span>Crédito: \${{entry.totalCredit | number:'1.2-2'}}</span>
                <span [style.color]="entry.balance >= 0 ? 'green' : 'red'">
                  Saldo: \${{entry.balance | number:'1.2-2'}}
                </span>
              </div>
            </div>
          </div>
        </mat-expansion-panel>
      </mat-accordion>

      <div *ngIf="ledgerEntries.length === 0 && !isLoading" style="text-align:center; padding:48px; color:#757575;">
        <mat-icon style="font-size:64px; width:64px; height:64px;">account_balance</mat-icon>
        <p style="margin-top:16px;">No hay movimientos contables</p>
        <p style="font-size:12px;">Los movimientos aparecerán aquí cuando se registren asientos contables</p>
      </div>

      <div *ngIf="isLoading" style="text-align:center; padding:48px;">
        <mat-spinner diameter="40"></mat-spinner>
        <p style="margin-top:16px;">Cargando mayor contable...</p>
      </div>

      <div style="margin-top:12px; font-size:12px; color:#757575; text-align:right;">
        Mostrando hasta 500 movimientos
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
      margin-bottom: 8px;
    }
    mat-panel-title {
      font-size: 14px;
    }
  `]
})
export class AccountingMayorComponent implements OnInit {
  private readonly api = `${environment.apiUrl}/accounting/ledger`;
  movementColumns = ['date', 'entryNumber', 'description', 'debit', 'credit'];
  ledgerEntries: LedgerEntry[] = [];
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
    this.loadLedger();
  }

  loadLedger(): void {
    this.isLoading = true;
    const filters = this.filterForm.value;
    let params: any = {};
    
    if (filters.startDate) params.startDate = filters.startDate;
    if (filters.endDate) params.endDate = filters.endDate;
    if (filters.accountCode) params.accountCode = filters.accountCode;

    this.http.get<LedgerEntry[]>(this.api, { params }).subscribe({
      next: (data) => {
        this.ledgerEntries = data;
        this.isLoading = false;
      },
      error: (err) => {
        console.error('Error cargando mayor:', err);
        this.toastr.error('Error al cargar mayor contable');
        this.isLoading = false;
      }
    });
  }

  clearFilters(): void {
    this.filterForm.reset();
    this.loadLedger();
  }

  get totalDebits(): number {
    return this.ledgerEntries.reduce((sum, entry) => sum + entry.totalDebit, 0);
  }

  get totalCredits(): number {
    return this.ledgerEntries.reduce((sum, entry) => sum + entry.totalCredit, 0);
  }

  get isBalanced(): boolean {
    return Math.abs(this.totalDebits - this.totalCredits) < 0.01;
  }
}