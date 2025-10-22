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
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatTooltipModule } from '@angular/material/tooltip';
import { MatDividerModule } from '@angular/material/divider';
import { ToastrService } from 'ngx-toastr';
import { HttpClient } from '@angular/common/http';
import { environment } from '../../../../environments/environment';

interface TrialBalanceAccount {
  accountCode: string;
  accountName: string;
  totalDebit: number;
  totalCredit: number;
  balance: number;
}

interface TrialBalance {
  asOfDate: string;
  assets: TrialBalanceAccount[];
  liabilities: TrialBalanceAccount[];
  equity: TrialBalanceAccount[];
  totalAssetsDebit: number;
  totalAssetsCredit: number;
  totalAssetsBalance: number;
  totalLiabilitiesDebit: number;
  totalLiabilitiesCredit: number;
  totalLiabilitiesBalance: number;
  totalEquityDebit: number;
  totalEquityCredit: number;
  totalEquityBalance: number;
  totalDebits: number;
  totalCredits: number;
  isBalanced: boolean;
}

@Component({
  selector: 'app-accounting-trial-balance',
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
    MatProgressSpinnerModule,
    MatTooltipModule,
    MatDividerModule
  ],
  template: `
  <mat-card>
    <mat-card-header>
      <mat-card-title>
        <mat-icon style="vertical-align:middle; margin-right:8px;">account_balance_wallet</mat-icon>
        Balance de Prueba
      </mat-card-title>
      <mat-card-subtitle>Estado de cuentas al {{trialBalance?.asOfDate | date:'dd/MM/yyyy'}}</mat-card-subtitle>
    </mat-card-header>

    <mat-card-content>
      <!-- Filtros -->
      <form [formGroup]="filterForm" style="display:flex; gap:12px; margin-bottom:16px; flex-wrap:wrap;">
        <mat-form-field appearance="outline" style="flex:0 0 200px;">
          <mat-label>Fecha de Corte</mat-label>
          <input matInput type="date" formControlName="asOfDate" />
        </mat-form-field>

        <button mat-stroked-button color="primary" (click)="loadTrialBalance()" style="height:56px;">
          <mat-icon>refresh</mat-icon>
          Actualizar
        </button>
      </form>

      <!-- Estado del Balance -->
      <div *ngIf="trialBalance" style="margin-bottom:16px; padding:12px; border-radius:4px;" 
           [style.background]="trialBalance.isBalanced ? '#e8f5e8' : '#ffe8e8'"
           [style.border]="trialBalance.isBalanced ? '1px solid #4caf50' : '1px solid #f44336'">
        <div style="display:flex; justify-content:space-between; align-items:center;">
          <div>
            <mat-icon [style.color]="trialBalance.isBalanced ? 'green' : 'red'">
              {{trialBalance.isBalanced ? 'check_circle' : 'error'}}
            </mat-icon>
            <strong style="margin-left:8px;">
              {{trialBalance.isBalanced ? 'Balance Correcto' : 'Balance Desbalanceado'}}
            </strong>
          </div>
          <div style="display:flex; gap:24px; font-size:14px;">
            <div>
              <strong>Total Débitos:</strong> \${{trialBalance.totalDebits | number:'1.2-2'}}
            </div>
            <div>
              <strong>Total Créditos:</strong> \${{trialBalance.totalCredits | number:'1.2-2'}}
            </div>
            <div [style.color]="trialBalance.isBalanced ? 'green' : 'red'">
              <strong>Diferencia:</strong> \${{(trialBalance.totalDebits - trialBalance.totalCredits) | number:'1.2-2'}}
            </div>
          </div>
        </div>
      </div>

      <!-- Activos -->
      <div *ngIf="trialBalance && trialBalance.assets && trialBalance.assets.length > 0" style="margin-bottom:24px;">
        <h3 style="color:#1976d2; margin-bottom:12px;">
          <mat-icon style="vertical-align:middle; margin-right:8px;">trending_up</mat-icon>
          ACTIVOS
        </h3>
        
        <table mat-table [dataSource]="trialBalance.assets || []" style="width:100%;">
          <ng-container matColumnDef="accountCode">
            <th mat-header-cell *matHeaderCellDef> Código </th>
            <td mat-cell *matCellDef="let account"> {{account.accountCode}} </td>
          </ng-container>

          <ng-container matColumnDef="accountName">
            <th mat-header-cell *matHeaderCellDef> Cuenta </th>
            <td mat-cell *matCellDef="let account"> {{account.accountName}} </td>
          </ng-container>

          <ng-container matColumnDef="totalDebit">
            <th mat-header-cell *matHeaderCellDef> Débito </th>
            <td mat-cell *matCellDef="let account" style="text-align:right;">
              \${{account.totalDebit | number:'1.2-2'}}
            </td>
          </ng-container>

          <ng-container matColumnDef="totalCredit">
            <th mat-header-cell *matHeaderCellDef> Crédito </th>
            <td mat-cell *matCellDef="let account" style="text-align:right;">
              \${{account.totalCredit | number:'1.2-2'}}
            </td>
          </ng-container>

          <ng-container matColumnDef="balance">
            <th mat-header-cell *matHeaderCellDef> Saldo </th>
            <td mat-cell *matCellDef="let account" style="text-align:right;">
              <span [style.color]="account.balance >= 0 ? 'green' : 'red'">
                \${{account.balance | number:'1.2-2'}}
              </span>
            </td>
          </ng-container>

          <tr mat-header-row *matHeaderRowDef="displayedColumns"></tr>
          <tr mat-row *matRowDef="let row; columns: displayedColumns;"></tr>
        </table>

        <div style="margin-top:12px; padding:8px; background:#e3f2fd; border-radius:4px;">
          <div style="display:flex; justify-content:space-between; font-weight:500;">
            <span>Total Activos:</span>
            <div style="display:flex; gap:16px;">
              <span>Débito: \${{trialBalance.totalAssetsDebit || 0 | number:'1.2-2'}}</span>
              <span>Crédito: \${{trialBalance.totalAssetsCredit || 0 | number:'1.2-2'}}</span>
              <span [style.color]="(trialBalance.totalAssetsBalance || 0) >= 0 ? 'green' : 'red'">
                Saldo: \${{trialBalance.totalAssetsBalance || 0 | number:'1.2-2'}}
              </span>
            </div>
          </div>
        </div>
      </div>

      <mat-divider style="margin:24px 0;"></mat-divider>

      <!-- Pasivos -->
      <div *ngIf="trialBalance && trialBalance.liabilities && trialBalance.liabilities.length > 0" style="margin-bottom:24px;">
        <h3 style="color:#f44336; margin-bottom:12px;">
          <mat-icon style="vertical-align:middle; margin-right:8px;">trending_down</mat-icon>
          PASIVOS
        </h3>
        
        <table mat-table [dataSource]="trialBalance.liabilities || []" style="width:100%;">
          <ng-container matColumnDef="accountCode">
            <th mat-header-cell *matHeaderCellDef> Código </th>
            <td mat-cell *matCellDef="let account"> {{account.accountCode}} </td>
          </ng-container>

          <ng-container matColumnDef="accountName">
            <th mat-header-cell *matHeaderCellDef> Cuenta </th>
            <td mat-cell *matCellDef="let account"> {{account.accountName}} </td>
          </ng-container>

          <ng-container matColumnDef="totalDebit">
            <th mat-header-cell *matHeaderCellDef> Débito </th>
            <td mat-cell *matCellDef="let account" style="text-align:right;">
              \${{account.totalDebit | number:'1.2-2'}}
            </td>
          </ng-container>

          <ng-container matColumnDef="totalCredit">
            <th mat-header-cell *matHeaderCellDef> Crédito </th>
            <td mat-cell *matCellDef="let account" style="text-align:right;">
              \${{account.totalCredit | number:'1.2-2'}}
            </td>
          </ng-container>

          <ng-container matColumnDef="balance">
            <th mat-header-cell *matHeaderCellDef> Saldo </th>
            <td mat-cell *matCellDef="let account" style="text-align:right;">
              <span [style.color]="account.balance >= 0 ? 'green' : 'red'">
                \${{account.balance | number:'1.2-2'}}
              </span>
            </td>
          </ng-container>

          <tr mat-header-row *matHeaderRowDef="displayedColumns"></tr>
          <tr mat-row *matRowDef="let row; columns: displayedColumns;"></tr>
        </table>

        <div style="margin-top:12px; padding:8px; background:#ffebee; border-radius:4px;">
          <div style="display:flex; justify-content:space-between; font-weight:500;">
            <span>Total Pasivos:</span>
            <div style="display:flex; gap:16px;">
              <span>Débito: \${{trialBalance.totalLiabilitiesDebit || 0 | number:'1.2-2'}}</span>
              <span>Crédito: \${{trialBalance.totalLiabilitiesCredit || 0 | number:'1.2-2'}}</span>
              <span [style.color]="(trialBalance.totalLiabilitiesBalance || 0) >= 0 ? 'green' : 'red'">
                Saldo: \${{trialBalance.totalLiabilitiesBalance || 0 | number:'1.2-2'}}
              </span>
            </div>
          </div>
        </div>
      </div>

      <mat-divider style="margin:24px 0;"></mat-divider>

      <!-- Patrimonio -->
      <div *ngIf="trialBalance && trialBalance.equity && trialBalance.equity.length > 0" style="margin-bottom:24px;">
        <h3 style="color:#ff9800; margin-bottom:12px;">
          <mat-icon style="vertical-align:middle; margin-right:8px;">account_balance</mat-icon>
          PATRIMONIO
        </h3>
        
        <table mat-table [dataSource]="trialBalance.equity || []" style="width:100%;">
          <ng-container matColumnDef="accountCode">
            <th mat-header-cell *matHeaderCellDef> Código </th>
            <td mat-cell *matCellDef="let account"> {{account.accountCode}} </td>
          </ng-container>

          <ng-container matColumnDef="accountName">
            <th mat-header-cell *matHeaderCellDef> Cuenta </th>
            <td mat-cell *matCellDef="let account"> {{account.accountName}} </td>
          </ng-container>

          <ng-container matColumnDef="totalDebit">
            <th mat-header-cell *matHeaderCellDef> Débito </th>
            <td mat-cell *matCellDef="let account" style="text-align:right;">
              \${{account.totalDebit | number:'1.2-2'}}
            </td>
          </ng-container>

          <ng-container matColumnDef="totalCredit">
            <th mat-header-cell *matHeaderCellDef> Crédito </th>
            <td mat-cell *matCellDef="let account" style="text-align:right;">
              \${{account.totalCredit | number:'1.2-2'}}
            </td>
          </ng-container>

          <ng-container matColumnDef="balance">
            <th mat-header-cell *matHeaderCellDef> Saldo </th>
            <td mat-cell *matCellDef="let account" style="text-align:right;">
              <span [style.color]="account.balance >= 0 ? 'green' : 'red'">
                \${{account.balance | number:'1.2-2'}}
              </span>
            </td>
          </ng-container>

          <tr mat-header-row *matHeaderRowDef="displayedColumns"></tr>
          <tr mat-row *matRowDef="let row; columns: displayedColumns;"></tr>
        </table>

        <div style="margin-top:12px; padding:8px; background:#fff3e0; border-radius:4px;">
          <div style="display:flex; justify-content:space-between; font-weight:500;">
            <span>Total Patrimonio:</span>
            <div style="display:flex; gap:16px;">
              <span>Débito: \${{trialBalance.totalEquityDebit || 0 | number:'1.2-2'}}</span>
              <span>Crédito: \${{trialBalance.totalEquityCredit || 0 | number:'1.2-2'}}</span>
              <span [style.color]="(trialBalance.totalEquityBalance || 0) >= 0 ? 'green' : 'red'">
                Saldo: \${{trialBalance.totalEquityBalance || 0 | number:'1.2-2'}}
              </span>
            </div>
          </div>
        </div>
      </div>

      <div *ngIf="!trialBalance && !isLoading" style="text-align:center; padding:48px; color:#757575;">
        <mat-icon style="font-size:64px; width:64px; height:64px;">account_balance_wallet</mat-icon>
        <p style="margin-top:16px;">No hay datos contables</p>
        <p style="font-size:12px;">Los datos aparecerán aquí cuando se registren asientos contables</p>
      </div>

      <div *ngIf="isLoading" style="text-align:center; padding:48px;">
        <mat-spinner diameter="40"></mat-spinner>
        <p style="margin-top:16px;">Generando balance de prueba...</p>
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
    h3 {
      margin: 0;
      font-size: 16px;
      font-weight: 500;
    }
    table {
      margin-bottom: 8px;
    }
  `]
})
export class AccountingTrialBalanceComponent implements OnInit {
  private readonly api = `${environment.apiUrl}/accounting/trial-balance`;
  displayedColumns = ['accountCode', 'accountName', 'totalDebit', 'totalCredit', 'balance'];
  trialBalance: TrialBalance | null = null;
  isLoading = false;
  filterForm: FormGroup;

  constructor(
    private http: HttpClient,
    private toastr: ToastrService,
    private fb: FormBuilder
  ) {
    this.filterForm = this.fb.group({
      asOfDate: ['']
    });
  }

  ngOnInit(): void {
    this.loadTrialBalance();
  }

  loadTrialBalance(): void {
    this.isLoading = true;
    const filters = this.filterForm.value;
    let params: any = {};
    
    if (filters.asOfDate) params.asOfDate = filters.asOfDate;

    this.http.get<TrialBalance>(this.api, { params }).subscribe({
      next: (data) => {
        this.trialBalance = data;
        this.isLoading = false;
      },
      error: (err) => {
        console.error('Error cargando balance de prueba:', err);
        this.toastr.error('Error al cargar balance de prueba');
        this.isLoading = false;
      }
    });
  }
}