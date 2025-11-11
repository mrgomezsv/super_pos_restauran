import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Subject, takeUntil } from 'rxjs';
import { MatCardModule } from '@angular/material/card';
import { MatTableModule } from '@angular/material/table';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatDialogModule, MatDialog } from '@angular/material/dialog';
import { MatChipsModule } from '@angular/material/chips';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatTooltipModule } from '@angular/material/tooltip';
import { ToastrService } from 'ngx-toastr';

import { UserService } from '../../core/services/user.service';
import { User } from '../../core/models/user.model';
import { UserDialogComponent } from './user-dialog/user-dialog.component';

@Component({
  selector: 'app-users',
  standalone: true,
  imports: [
    CommonModule,
    MatCardModule,
    MatTableModule,
    MatButtonModule,
    MatIconModule,
    MatDialogModule,
    MatChipsModule,
    MatProgressSpinnerModule,
    MatTooltipModule
  ],
  templateUrl: './users.component.html',
  styleUrls: ['./users.component.scss']
})
export class UsersComponent implements OnInit, OnDestroy {
  users: User[] = [];
  displayedColumns: string[] = ['username', 'name', 'email', 'role', 'status', 'lastLogin', 'actions'];
  isLoading = true;
  private destroy$ = new Subject<void>();

  constructor(
    private userService: UserService,
    private dialog: MatDialog,
    private toastr: ToastrService
  ) {}

  ngOnInit(): void {
    this.loadUsers();
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  private loadUsers(): void {
    this.isLoading = true;
    
    this.userService.getUsers()
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (users) => {
          this.users = users;
          this.isLoading = false;
        },
        error: (error) => {
          console.error('Error loading users:', error);
          this.toastr.error('Error al cargar los usuarios');
          this.isLoading = false;
        }
      });
  }

  openUserDialog(user?: User): void {
    // Guardar la posición actual del scroll
    const scrollY = window.scrollY;
    
    // Agregar clase al body para prevenir layout shift
    document.body.classList.add('modal-open');
    document.body.style.top = `-${scrollY}px`;
    
    const dialogRef = this.dialog.open(UserDialogComponent, {
      width: '600px',
      maxWidth: '90vw',
      maxHeight: '90vh',
      panelClass: 'custom-dialog-container',
      hasBackdrop: true,
      disableClose: false,
      autoFocus: true,
      data: user
    });

    dialogRef.afterClosed().subscribe(result => {
      // Remover clase del body al cerrar el modal
      document.body.classList.remove('modal-open');
      document.body.style.top = '';
      
      // Restaurar la posición del scroll
      window.scrollTo(0, scrollY);
      
      if (result) {
        this.loadUsers();
      }
    });
  }

  editUser(user: User): void {
    this.openUserDialog(user);
  }

  toggleUserStatus(user: User): void {
    const action = user.isActive ? 'desactivar' : 'activar';
    if (confirm(`¿Está seguro de ${action} al usuario "${user.name}"?`)) {
      const updatedUser = { ...user, isActive: !user.isActive };
      
      this.userService.updateUser(user.id, updatedUser)
        .pipe(takeUntil(this.destroy$))
        .subscribe({
          next: () => {
            this.toastr.success(`Usuario ${action}do exitosamente`);
            this.loadUsers();
          },
          error: (error) => {
            console.error('Error updating user:', error);
            this.toastr.error('Error al actualizar el usuario');
          }
        });
    }
  }

  deleteUser(user: User): void {
    if (confirm(`¿Está seguro de eliminar al usuario "${user.name}"?`)) {
      this.userService.deleteUser(user.id)
        .pipe(takeUntil(this.destroy$))
        .subscribe({
          next: () => {
            this.toastr.success('Usuario eliminado exitosamente');
            this.loadUsers();
          },
          error: (error) => {
            console.error('Error deleting user:', error);
            this.toastr.error('Error al eliminar el usuario');
          }
        });
    }
  }

  getRoleColor(role: string): string {
    switch (role) {
      case 'admin':
        return 'warn';
      case 'manager':
        return 'accent';
      case 'cashier':
        return 'primary';
      default:
        return '';
    }
  }

  getRoleLabel(role: string): string {
    switch (role) {
      case 'admin':
        return 'Administrador';
      case 'manager':
        return 'Gerente';
      case 'cashier':
        return 'Cajero';
      default:
        return role;
    }
  }
}