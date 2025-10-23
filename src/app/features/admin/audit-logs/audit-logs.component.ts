import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatCardModule } from '@angular/material/card';
import { MatTableModule } from '@angular/material/table';
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { ReactiveFormsModule, FormBuilder } from '@angular/forms';
import { HttpClient } from '@angular/common/http';
import { ToastrService } from 'ngx-toastr';
import { environment } from '../../../../environments/environment';

interface AuditLog {
  id: number;
  company_id?: number;
  userId: number;
  action: string;
  module: string;
  detail?: string;
  createdAt: string;
}

@Component({
  selector: 'app-admin-audit-logs',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule, 
    MatCardModule, 
    MatTableModule,
    MatIconModule,
    MatButtonModule,
    MatFormFieldModule,
    MatInputModule,
    MatSelectModule
  ],
  templateUrl: './audit-logs.component.html',
  styles: [`
    mat-card {
      margin: 16px;
    }
    mat-card-header {
      margin-bottom: 16px;
    }
  `]
})
export class AdminAuditLogsComponent implements OnInit {
  private readonly api = `${environment.apiUrl}/audit-logs`;
  cols = ['date', 'user', 'action', 'module', 'detail'];
  logs: AuditLog[] = [];
  filterForm: any;

  constructor(
    private http: HttpClient,
    private toastr: ToastrService,
    private fb: FormBuilder
  ) {
    this.filterForm = this.fb.group({
      module: [''],
      startDate: [''],
      endDate: ['']
    });
  }

  ngOnInit(): void {
    this.load();
  }

  load(): void {
    const filters = this.filterForm.value;
    let params: any = {};
    
    if (filters.module) params.module = filters.module;
    if (filters.startDate) params.startDate = filters.startDate;
    if (filters.endDate) params.endDate = filters.endDate;

    this.http.get<AuditLog[]>(this.api, { params }).subscribe({
      next: (data) => {
        this.logs = data;
      },
      error: (err) => {
        console.error('Error cargando bitácora:', err);
        this.toastr.error('Error al cargar bitácora');
      }
    });
  }

  clearFilters(): void {
    this.filterForm.reset();
    this.load();
  }

  getActionColor(action: string): string {
    if (action.includes('SUCCESS') || action.includes('CREATE')) return '#4caf50';
    if (action.includes('FAILED') || action.includes('DELETE')) return '#f44336';
    if (action.includes('UPDATE')) return '#ff9800';
    return '#757575';
  }
}
