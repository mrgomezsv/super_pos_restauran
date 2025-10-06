import { Component, Inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, Validators, ReactiveFormsModule } from '@angular/forms';
import { MatDialogRef, MAT_DIALOG_DATA, MatDialogModule } from '@angular/material/dialog';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatSelectModule } from '@angular/material/select';
import { MatCheckboxModule } from '@angular/material/checkbox';
import { ToastrService } from 'ngx-toastr';

import { UserService } from '../../../core/services/user.service';
import { User } from '../../../core/models/user.model';

@Component({
  selector: 'app-user-dialog',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    MatDialogModule,
    MatFormFieldModule,
    MatInputModule,
    MatButtonModule,
    MatIconModule,
    MatSelectModule,
    MatCheckboxModule
  ],
  template: `
    <h2 mat-dialog-title>
      <mat-icon>{{ isEdit ? 'edit' : 'person_add' }}</mat-icon>
      {{ isEdit ? 'Editar Usuario' : 'Nuevo Usuario' }}
    </h2>

    <mat-dialog-content>
      <form [formGroup]="userForm" class="user-form">
        <div class="form-row">
          <mat-form-field appearance="outline" class="half-width">
            <mat-label>Nombre de Usuario</mat-label>
            <input matInput formControlName="username" placeholder="usuario123">
            <mat-icon matSuffix>person</mat-icon>
            <mat-error *ngIf="userForm.get('username')?.hasError('required')">
              El nombre de usuario es requerido
            </mat-error>
            <mat-error *ngIf="userForm.get('username')?.hasError('minlength')">
              Mínimo 3 caracteres
            </mat-error>
          </mat-form-field>

          <mat-form-field appearance="outline" class="half-width">
            <mat-label>Rol</mat-label>
            <mat-select formControlName="role">
              <mat-option value="admin">Administrador</mat-option>
              <mat-option value="manager">Gerente</mat-option>
              <mat-option value="cashier">Cajero</mat-option>
            </mat-select>
            <mat-icon matSuffix>admin_panel_settings</mat-icon>
            <mat-error *ngIf="userForm.get('role')?.hasError('required')">
              El rol es requerido
            </mat-error>
          </mat-form-field>
        </div>

        <mat-form-field appearance="outline" class="full-width">
          <mat-label>Nombre Completo</mat-label>
          <input matInput formControlName="name" placeholder="Nombre y apellidos">
          <mat-icon matSuffix>badge</mat-icon>
          <mat-error *ngIf="userForm.get('name')?.hasError('required')">
            El nombre completo es requerido
          </mat-error>
        </mat-form-field>

        <mat-form-field appearance="outline" class="full-width">
          <mat-label>Correo Electrónico</mat-label>
          <input matInput formControlName="email" type="email" placeholder="usuario@ejemplo.com">
          <mat-icon matSuffix>email</mat-icon>
          <mat-error *ngIf="userForm.get('email')?.hasError('required')">
            El correo electrónico es requerido
          </mat-error>
          <mat-error *ngIf="userForm.get('email')?.hasError('email')">
            Formato de correo inválido
          </mat-error>
        </mat-form-field>

        <mat-form-field appearance="outline" class="full-width" *ngIf="!isEdit">
          <mat-label>Contraseña</mat-label>
          <input matInput 
                 [type]="hidePassword ? 'password' : 'text'" 
                 formControlName="password" 
                 placeholder="Mínimo 8 caracteres">
          <button mat-icon-button matSuffix 
                  type="button"
                  (click)="hidePassword = !hidePassword" 
                  [attr.aria-label]="'Ocultar contraseña'" 
                  [attr.aria-pressed]="hidePassword">
            <mat-icon>{{hidePassword ? 'visibility_off' : 'visibility'}}</mat-icon>
          </button>
          <mat-error *ngIf="userForm.get('password')?.hasError('required')">
            La contraseña es requerida
          </mat-error>
          <mat-error *ngIf="userForm.get('password')?.hasError('minlength')">
            Mínimo 8 caracteres
          </mat-error>
        </mat-form-field>

        <div class="checkbox-row">
          <mat-checkbox formControlName="isActive">
            Usuario Activo
          </mat-checkbox>
        </div>
      </form>
    </mat-dialog-content>

    <mat-dialog-actions align="end">
      <button mat-button (click)="onCancel()">Cancelar</button>
      <button mat-raised-button 
              color="primary" 
              (click)="onSave()"
              [disabled]="userForm.invalid">
        <mat-icon>save</mat-icon>
        {{ isEdit ? 'Actualizar' : 'Crear' }}
      </button>
    </mat-dialog-actions>
  `,
  styles: [`
    .user-form {
      display: flex;
      flex-direction: column;
      gap: 16px;
      min-width: 450px;
    }

    .form-row {
      display: flex;
      gap: 16px;
    }

    .half-width {
      flex: 1;
    }

    .full-width {
      width: 100%;
    }

    .checkbox-row {
      margin-top: 16px;
    }

    mat-dialog-title {
      display: flex;
      align-items: center;
      gap: 8px;
    }

    @media (max-width: 768px) {
      .user-form {
        min-width: auto;
      }

      .form-row {
        flex-direction: column;
        gap: 8px;
      }

      .half-width {
        width: 100%;
      }
    }
  `]
})
export class UserDialogComponent {
  userForm: FormGroup;
  isEdit = false;
  hidePassword = true;

  constructor(
    public dialogRef: MatDialogRef<UserDialogComponent>,
    @Inject(MAT_DIALOG_DATA) public data: User | null,
    private fb: FormBuilder,
    private userService: UserService,
    private toastr: ToastrService
  ) {
    this.userForm = this.fb.group({
      username: ['', [Validators.required, Validators.minLength(3)]],
      name: ['', [Validators.required]],
      email: ['', [Validators.required, Validators.email]],
      password: ['', this.data ? [] : [Validators.required, Validators.minLength(8)]],
      role: ['cashier', [Validators.required]],
      isActive: [true]
    });
  }

  ngOnInit() {
    if (this.data) {
      this.isEdit = true;
      this.userForm.patchValue(this.data);
      // Remover validación de contraseña para edición
      this.userForm.get('password')?.clearValidators();
      this.userForm.get('password')?.updateValueAndValidity();
    }
  }

  onCancel() {
    this.dialogRef.close();
  }

  onSave() {
    if (this.userForm.valid) {
      const userData = this.userForm.value;
      
      // Remover contraseña vacía en edición
      if (this.isEdit && !userData.password) {
        delete userData.password;
      }

      if (this.isEdit && this.data) {
        this.userService.updateUser(this.data.id, userData)
          .subscribe({
            next: (user) => {
              this.toastr.success('Usuario actualizado exitosamente', 'Éxito');
              this.dialogRef.close(user);
            },
            error: (error) => {
              this.toastr.error('Error al actualizar usuario', 'Error');
            }
          });
      } else {
        this.userService.createUser(userData)
          .subscribe({
            next: (user) => {
              this.toastr.success('Usuario creado exitosamente', 'Éxito');
              this.dialogRef.close(user);
            },
            error: (error) => {
              this.toastr.error('Error al crear usuario', 'Error');
            }
          });
      }
    }
  }
}
