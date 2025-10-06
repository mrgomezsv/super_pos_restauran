import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, Validators, ReactiveFormsModule } from '@angular/forms';
import { Subject, takeUntil } from 'rxjs';
import { MatCardModule } from '@angular/material/card';
import { MatTableModule } from '@angular/material/table';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatDialogModule, MatDialog } from '@angular/material/dialog';
import { MatSelectModule } from '@angular/material/select';
import { MatChipsModule } from '@angular/material/chips';
import { MatCheckboxModule } from '@angular/material/checkbox';
import { ToastrService } from 'ngx-toastr';

import { UserService } from '../../core/services/user.service';
import { User } from '../../core/models/user.model';
import { UserDialogComponent } from './user-dialog/user-dialog.component';

@Component({
  selector: 'app-users',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    MatCardModule,
    MatTableModule,
    MatButtonModule,
    MatIconModule,
    MatInputModule,
    MatFormFieldModule,
    MatDialogModule,
    MatSelectModule,
    MatChipsModule,
    MatCheckboxModule
  ],
  template: `
    <div class="users-container">
      <div class="users-header">
        <h1>Gestión de Usuarios</h1>
        <button mat-raised-button color="primary" (click)="openUserDialog()">
          <mat-icon>person_add</mat-icon>
          Nuevo Usuario
        </button>
      </div>

      <!-- Users Table -->
      <mat-card class="users-table-card">
        <mat-card-content>
          <div class="table-container" *ngIf="!isLoading; else loadingTemplate">
            <table mat-table [dataSource]="users" class="users-table">
              <!-- Username Column -->
              <ng-container matColumnDef="username">
                <th mat-header-cell *matHeaderCellDef> Usuario </th>
                <td mat-cell *matCellDef="let user"> {{ user.username }} </td>
              </ng-container>

              <!-- Name Column -->
              <ng-container matColumnDef="name">
                <th mat-header-cell *matHeaderCellDef> Nombre </th>
                <td mat-cell *matCellDef="let user"> {{ user.name }} </td>
              </ng-container>

              <!-- Email Column -->
              <ng-container matColumnDef="email">
                <th mat-header-cell *matHeaderCellDef> Correo </th>
                <td mat-cell *matCellDef="let user"> {{ user.email }} </td>
              </ng-container>

              <!-- Role Column -->
              <ng-container matColumnDef="role">
                <th mat-header-cell *matHeaderCellDef> Rol </th>
                <td mat-cell *matCellDef="let user"> 
                  <mat-chip [color]="getRoleColor(user.role)" selected>
                    {{ getRoleLabel(user.role) }}
                  </mat-chip>
                </td>
              </ng-container>

              <!-- Status Column -->
              <ng-container matColumnDef="status">
                <th mat-header-cell *matHeaderCellDef> Estado </th>
                <td mat-cell *matCellDef="let user"> 
                  <mat-chip [color]="user.isActive ? 'primary' : 'warn'" selected>
                    {{ user.isActive ? 'Activo' : 'Inactivo' }}
                  </mat-chip>
                </td>
              </ng-container>

              <!-- Last Login Column -->
              <ng-container matColumnDef="lastLogin">
                <th mat-header-cell *matHeaderCellDef> Último Acceso </th>
                <td mat-cell *matCellDef="let user"> 
                  {{ user.lastLogin ? (user.lastLogin | date:'short') : 'Nunca' }}
                </td>
              </ng-container>

              <!-- Actions Column -->
              <ng-container matColumnDef="actions">
                <th mat-header-cell *matHeaderCellDef> Acciones </th>
                <td mat-cell *matCellDef="let user"> 
                  <button mat-icon-button (click)="editUser(user)" matTooltip="Editar">
                    <mat-icon>edit</mat-icon>
                  </button>
                  <button mat-icon-button 
                          [color]="user.isActive ? 'warn' : 'primary'" 
                          (click)="toggleUserStatus(user)" 
                          matTooltip="{{ user.isActive ? 'Desactivar' : 'Activar' }}">
                    <mat-icon>{{ user.isActive ? 'block' : 'check_circle' }}</mat-icon>
                  </button>
                </td>
              </ng-container>

              <tr mat-header-row *matHeaderRowDef="displayedColumns"></tr>
              <tr mat-row *matRowDef="let row; columns: displayedColumns;"></tr>
            </table>
          </div>

          <ng-template #loadingTemplate>
            <div class="loading-container">
              <mat-spinner diameter="40"></mat-spinner>
              <p>Cargando usuarios...</p>
            </div>
          </ng-template>
        </mat-card-content>
      </mat-card>
    </div>
  `,
  styles: [`
    .users-container {
      padding: 20px;
    }

    .users-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-bottom: 24px;
    }

    .users-header h1 {
      margin: 0;
      color: #1976d2;
    }

    .users-table-card {
      margin-bottom: 20px;
    }

    .table-container {
      overflow-x: auto;
    }

    .users-table {
      width: 100%;
    }

    .loading-container {
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      padding: 40px;
      color: #666;
    }

    .loading-container p {
      margin-top: 16px;
    }

    @media (max-width: 768px) {
      .users-header {
        flex-direction: column;
        gap: 16px;
        align-items: stretch;
      }
    }
  `]
})
export class UsersComponent implements OnInit, OnDestroy {
  private destroy$ = new Subject<void>();

  users: User[] = [];
  displayedColumns: string[] = ['username', 'name', 'email', 'role', 'status', 'lastLogin', 'actions'];
  isLoading = false;

  constructor(
    private userService: UserService,
    private dialog: MatDialog,
    private toastr: ToastrService
  ) {}

  ngOnInit() {
    this.loadUsers();
  }

  ngOnDestroy() {
    this.destroy$.next();
    this.destroy$.complete();
  }

  loadUsers() {
    this.isLoading = true;
    
    this.userService.getUsers()
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (users) => {
          this.users = users;
          this.isLoading = false;
        },
        error: (error) => {
          this.isLoading = false;
          this.toastr.error('Error al cargar usuarios', 'Error');
        }
      });
  }

  openUserDialog(user?: User) {
    const dialogRef = this.dialog.open(UserDialogComponent, {
      width: '500px',
      data: user || null
    });

    dialogRef.afterClosed().subscribe(result => {
      if (result) {
        this.loadUsers();
      }
    });
  }

  editUser(user: User) {
    this.openUserDialog(user);
  }

  toggleUserStatus(user: User) {
    const action = user.isActive ? 'desactivar' : 'activar';
    if (confirm(`¿Está seguro de ${action} el usuario "${user.name}"?`)) {
      const updatedUser = { ...user, isActive: !user.isActive };
      
      this.userService.updateUser(user.id, updatedUser)
        .pipe(takeUntil(this.destroy$))
        .subscribe({
          next: () => {
            this.toastr.success(`Usuario ${action} exitosamente`, 'Éxito');
            this.loadUsers();
          },
          error: (error) => {
            this.toastr.error(`Error al ${action} usuario`, 'Error');
          }
        });
    }
  }

  getRoleLabel(role: string): string {
    const labels: { [key: string]: string } = {
      'admin': 'Administrador',
      'manager': 'Gerente',
      'cashier': 'Cajero'
    };
    return labels[role] || role;
  }

  getRoleColor(role: string): string {
    const colors: { [key: string]: string } = {
      'admin': 'warn',
      'manager': 'accent',
      'cashier': 'primary'
    };
    return colors[role] || 'primary';
  }
}
