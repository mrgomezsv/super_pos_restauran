import { Component, Inject, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
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
    <div class="modal-overlay">
      <div class="modal-container user-modal">
        <!-- Header del Modal -->
        <div class="modal-header">
          <div class="header-content">
            <mat-icon class="header-icon">{{ isEdit ? 'edit' : 'person_add' }}</mat-icon>
            <div class="header-text">
              <h2 class="modal-title">{{ isEdit ? 'Editar Usuario' : 'Nuevo Usuario' }}</h2>
              <p class="modal-subtitle">
                {{ isEdit ? 'Modifica la información del usuario' : 'Agrega un nuevo usuario al sistema' }}
              </p>
            </div>
          </div>
          <button mat-icon-button class="close-btn" (click)="onCancel()">
            <mat-icon>close</mat-icon>
          </button>
        </div>

        <!-- Contenido del Modal -->
        <div class="modal-content">
          <form [formGroup]="userForm" class="user-form">
            <!-- Información de Cuenta -->
            <div class="form-section">
              <h3 class="section-title">
                <mat-icon>person</mat-icon>
                Información de Cuenta
              </h3>
              
              <div class="form-row">
                <mat-form-field appearance="outline" class="form-field" [class.mat-form-field-invalid]="userForm.get('username')?.hasError('required') && userForm.get('username')?.touched">
                  <mat-label>Nombre de Usuario *</mat-label>
                  <input matInput formControlName="username" placeholder="Ingrese el nombre de usuario" autocomplete="off" maxlength="50">
                  <mat-hint align="end">{{ userForm.get('username')?.value?.length || 0 }}/50</mat-hint>
                  <mat-error *ngIf="userForm.get('username')?.hasError('required') && userForm.get('username')?.touched">
                    El nombre de usuario es requerido
                  </mat-error>
                  <mat-error *ngIf="userForm.get('username')?.hasError('minlength')">
                    Mínimo 3 caracteres
                  </mat-error>
                </mat-form-field>

                <mat-form-field appearance="outline" class="form-field" [class.mat-form-field-invalid]="userForm.get('role')?.hasError('required') && userForm.get('role')?.touched">
                  <mat-label>Rol *</mat-label>
                  <mat-select formControlName="role" placeholder="Seleccione un rol">
                    <mat-option value="admin">
                      <div class="role-option">
                        <mat-icon class="role-icon">admin_panel_settings</mat-icon>
                        <div class="role-info">
                          <span class="role-name">Administrador</span>
                          <span class="role-description">Acceso completo al sistema</span>
                        </div>
                      </div>
                    </mat-option>
                    <mat-option value="manager">
                      <div class="role-option">
                        <mat-icon class="role-icon">manage_accounts</mat-icon>
                        <div class="role-info">
                          <span class="role-name">Gerente</span>
                          <span class="role-description">Gestión de ventas y productos</span>
                        </div>
                      </div>
                    </mat-option>
                    <mat-option value="cashier">
                      <div class="role-option">
                        <mat-icon class="role-icon">point_of_sale</mat-icon>
                        <div class="role-info">
                          <span class="role-name">Cajero</span>
                          <span class="role-description">Procesar ventas únicamente</span>
                        </div>
                      </div>
                    </mat-option>
                  </mat-select>
                  <mat-hint>Define los permisos del usuario</mat-hint>
                  <mat-error *ngIf="userForm.get('role')?.hasError('required') && userForm.get('role')?.touched">
                    El rol es requerido
                  </mat-error>
                </mat-form-field>
              </div>
            </div>

            <!-- Información Personal -->
            <div class="form-section">
              <h3 class="section-title">
                <mat-icon>badge</mat-icon>
                Información Personal
              </h3>
              
              <mat-form-field appearance="outline" class="form-field full-width" [class.mat-form-field-invalid]="userForm.get('name')?.hasError('required') && userForm.get('name')?.touched">
                <mat-label>Nombre Completo *</mat-label>
                <input matInput formControlName="name" placeholder="Ingrese el nombre completo" autocomplete="off" maxlength="100">
                <mat-hint align="end">{{ userForm.get('name')?.value?.length || 0 }}/100</mat-hint>
                <mat-error *ngIf="userForm.get('name')?.hasError('required') && userForm.get('name')?.touched">
                  El nombre completo es requerido
                </mat-error>
              </mat-form-field>

              <mat-form-field appearance="outline" class="form-field full-width" [class.mat-form-field-invalid]="userForm.get('email')?.hasError('required') && userForm.get('email')?.touched">
                <mat-label>Correo Electrónico *</mat-label>
                <input matInput formControlName="email" type="email" placeholder="usuario@ejemplo.com" autocomplete="off" maxlength="100">
                <mat-hint>Email para notificaciones y recuperación de cuenta</mat-hint>
                <mat-error *ngIf="userForm.get('email')?.hasError('required') && userForm.get('email')?.touched">
                  El correo electrónico es requerido
                </mat-error>
                <mat-error *ngIf="userForm.get('email')?.hasError('email')">
                  Formato de correo inválido
                </mat-error>
              </mat-form-field>
            </div>

            <!-- Seguridad -->
            <div class="form-section" *ngIf="!isEdit">
              <h3 class="section-title">
                <mat-icon>lock</mat-icon>
                Seguridad
              </h3>
              
              <mat-form-field appearance="outline" class="form-field full-width" [class.mat-form-field-invalid]="userForm.get('password')?.hasError('required') && userForm.get('password')?.touched">
                <mat-label>Contraseña *</mat-label>
                <input matInput 
                       [type]="hidePassword ? 'password' : 'text'" 
                       formControlName="password"
                       placeholder="Mínimo 8 caracteres"
                       autocomplete="new-password"
                       maxlength="50">
                <button mat-icon-button matSuffix 
                        type="button"
                        (click)="hidePassword = !hidePassword" 
                        [attr.aria-label]="'Ocultar contraseña'" 
                        [attr.aria-pressed]="hidePassword"
                        class="password-toggle">
                  <mat-icon>{{hidePassword ? 'visibility_off' : 'visibility'}}</mat-icon>
                </button>
                <mat-hint>La contraseña debe tener al menos 8 caracteres</mat-hint>
                <mat-error *ngIf="userForm.get('password')?.hasError('required') && userForm.get('password')?.touched">
                  La contraseña es requerida
                </mat-error>
                <mat-error *ngIf="userForm.get('password')?.hasError('minlength')">
                  Mínimo 8 caracteres
                </mat-error>
              </mat-form-field>
            </div>

            <!-- Estado del Usuario -->
            <div class="form-section">
              <h3 class="section-title">
                <mat-icon>toggle_on</mat-icon>
                Estado del Usuario
              </h3>
              
              <div class="checkbox-container">
                <mat-checkbox formControlName="isActive" class="status-checkbox">
                  <span class="checkbox-label">
                    <mat-icon>check_circle</mat-icon>
                    <span class="checkbox-text">Usuario Activo</span>
                  </span>
                </mat-checkbox>
                <p class="checkbox-hint">Los usuarios inactivos no podrán acceder al sistema</p>
              </div>
            </div>
          </form>
        </div>

        <!-- Acciones del Modal -->
        <div class="modal-actions">
          <button mat-button (click)="onCancel()" class="cancel-btn">
            <mat-icon>close</mat-icon>
            Cancelar
          </button>
          <button 
            mat-raised-button 
            color="primary"
            (click)="onSave()"
            [disabled]="userForm.invalid || userForm.pristine"
            class="save-btn">
            <mat-icon>{{ isEdit ? 'save' : 'add' }}</mat-icon>
            {{ isEdit ? 'Actualizar' : 'Crear' }}
          </button>
        </div>
      </div>
    </div>
  `,
  styles: [`
    .modal-overlay {
      position: fixed;
      top: 0;
      left: 0;
      right: 0;
      bottom: 0;
      background-color: rgba(255, 255, 255, 0.1) !important;
      backdrop-filter: blur(3px);
      display: flex;
      align-items: center;
      justify-content: center;
      z-index: 10000;
      padding: var(--spacing-lg);
      box-sizing: border-box;
      animation: fadeIn 0.3s ease;
      pointer-events: all;
      
      @keyframes fadeIn {
        from {
          opacity: 0;
          backdrop-filter: blur(0px);
        }
        to {
          opacity: 1;
          backdrop-filter: blur(3px);
        }
      }
      
      &::before {
        content: '';
        position: absolute;
        top: 0;
        left: 0;
        right: 0;
        bottom: 0;
        background: rgba(255, 255, 255, 0.1);
        backdrop-filter: blur(3px);
        z-index: -1;
        pointer-events: all;
      }
    }

    .modal-container {
      background: #ffffff !important;
      border-radius: var(--border-radius-xl);
      box-shadow: 0 25px 50px -12px rgba(0, 0, 0, 0.25);
      border: 1px solid #e2e8f0;
      width: 100%;
      max-width: 900px;
      max-height: 90vh;
      overflow: hidden;
      display: flex;
      flex-direction: column;
      animation: modalSlideIn 0.3s ease-out;
      position: relative;
      z-index: 10001;
      
      &::before {
        content: '';
        position: absolute;
        top: 0;
        left: 0;
        right: 0;
        bottom: 0;
        border-radius: var(--border-radius-xl);
        background: linear-gradient(135deg, rgba(255,255,255,0.1), rgba(255,255,255,0.05));
        pointer-events: none;
        z-index: 1;
      }
    }

    @keyframes modalSlideIn {
      from {
        opacity: 0;
        transform: translateY(-20px) scale(0.95);
      }
      to {
        opacity: 1;
        transform: translateY(0) scale(1);
      }
    }

    .modal-header {
      background: linear-gradient(135deg, #017E84 0%, #20C997 100%);
      color: white;
      padding: var(--spacing-xl);
      display: flex;
      align-items: center;
      justify-content: space-between;
      border-radius: var(--border-radius-xl) var(--border-radius-xl) 0 0;
      position: relative;
      z-index: 2;

      .header-content {
        display: flex;
        align-items: center;
        gap: var(--spacing-md);

        .header-icon {
          font-size: 32px;
          width: 32px;
          height: 32px;
          background: rgba(255, 255, 255, 0.2);
          border-radius: 50%;
          display: flex;
          align-items: center;
          justify-content: center;
        }

        .header-text {
          .modal-title {
            margin: 0;
            font-size: 24px;
            font-weight: 700;
            line-height: 1.2;
          }

          .modal-subtitle {
            margin: 4px 0 0 0;
            font-size: 14px;
            opacity: 0.9;
            font-weight: 400;
          }
        }
      }

      .close-btn {
        background: rgba(255, 255, 255, 0.2);
        color: white;
        border-radius: 50%;
        width: 40px;
        height: 40px;
        transition: all 0.3s ease;

        &:hover {
          background: rgba(255, 255, 255, 0.3);
          transform: scale(1.1);
        }

        .mat-icon {
          font-size: 24px;
        }
      }
    }

    .modal-content {
      background: #ffffff;
      flex: 1;
      overflow-y: auto;
      padding: var(--spacing-xl);
      
      .user-form {
        display: flex;
        flex-direction: column;
        gap: var(--spacing-2xl);
      }

      .form-section {
        background: #f8f9fa;
        border: 1px solid #e2e8f0;
        border-radius: var(--border-radius-lg);
        padding: var(--spacing-xl);
        margin-bottom: var(--spacing-xl);

        .section-title {
          display: flex;
          align-items: center;
          gap: var(--spacing-sm);
          font-size: 18px;
          font-weight: 600;
          color: #017E84;
          margin: 0 0 var(--spacing-xl) 0;
          padding-bottom: var(--spacing-sm);
          border-bottom: 2px solid #e2e8f0;

          mat-icon {
            color: #017E84;
            font-size: 24px;
            background: rgba(1, 126, 132, 0.1);
            border-radius: var(--border-radius);
            padding: var(--spacing-xs);
            width: 32px;
            height: 32px;
            display: flex;
            align-items: center;
            justify-content: center;
          }
        }

        .form-row {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: var(--spacing-lg);
          margin-bottom: var(--spacing-lg);
          align-items: end;

          &:last-child {
            margin-bottom: 0;
          }
          
          @media (max-width: 768px) {
            grid-template-columns: 1fr;
            gap: var(--spacing-md);
          }
        }

        .form-field {
          width: 100%;

          &.full-width {
            grid-column: 1 / -1;
          }
        }
      }

      // Form field styles from product modal
      .form-field {
        ::ng-deep {
          .mat-mdc-form-field {
            width: 100%;
            min-width: 200px;

            .mat-mdc-text-field-wrapper {
              background: #ffffff !important;
              border: 1px solid #e2e8f0 !important;
              border-radius: 8px !important;
              padding: 0 !important;
              min-height: 56px !important;
              transition: all 0.3s ease !important;
              position: relative !important;
              
              &:hover {
                border-color: #017E84 !important;
                box-shadow: 0 2px 8px rgba(1, 126, 132, 0.1) !important;
              }
            }

            .mat-mdc-form-field-infix {
              padding: 16px 12px 8px 12px !important;
              min-height: auto !important;
              display: block !important;
            }

            .mat-mdc-form-field-label {
              position: absolute !important;
              top: -8px !important;
              left: 12px !important;
              background: #ffffff !important;
              padding: 0 4px !important;
              font-size: 12px !important;
              font-weight: 600 !important;
              color: #017E84 !important;
              z-index: 1 !important;
              transition: all 0.3s ease !important;
              transform: none !important;
              transform-origin: unset !important;
              
              &.mat-mdc-form-field-label-filled,
              &.mat-mdc-form-field-label-floating,
              &.mdc-floating-label--float-above {
                position: absolute !important;
                top: -8px !important;
                left: 12px !important;
                background: #ffffff !important;
                padding: 0 4px !important;
                font-size: 12px !important;
                font-weight: 600 !important;
                color: #017E84 !important;
                z-index: 1 !important;
                transform: none !important;
              }
            }

            .mat-mdc-input-element {
              color: #333 !important;
              font-size: 16px !important;
              padding: 4px 0 !important;
              margin: 0 !important;
              border: none !important;
              background: transparent !important;
              outline: none !important;
              
              &::placeholder {
                color: #a0aec0 !important;
                font-style: italic !important;
              }
            }

            .mat-mdc-select {
              .mat-mdc-select-trigger {
                padding: 4px 0 !important;
                min-height: auto !important;
              }
              
              .mat-mdc-select-value {
                color: #333 !important;
                font-size: 16px !important;
              }
              
              .mat-mdc-select-placeholder {
                color: #a0aec0 !important;
                font-style: italic !important;
              }
            }

            &.mat-focused .mat-mdc-text-field-wrapper {
              border-color: #017E84 !important;
              border-width: 2px !important;
              box-shadow: 0 0 0 3px rgba(1, 126, 132, 0.1) !important;
            }

            &.mat-form-field-invalid .mat-mdc-text-field-wrapper {
              border-color: #f44336 !important;
              border-width: 2px !important;
              box-shadow: 0 0 0 3px rgba(244, 67, 54, 0.1) !important;
            }

            .mat-mdc-form-field-suffix {
              padding-right: 12px !important;
              
              .mat-mdc-icon-button {
                width: 24px !important;
                height: 24px !important;
                padding: 0 !important;
                
                .mat-icon {
                  font-size: 18px !important;
                  color: #666 !important;
                }
              }
            }

            .mat-mdc-form-field-subscript-wrapper {
              margin-top: 4px !important;
              padding: 0 12px !important;
              
              .mat-mdc-form-field-hint-wrapper,
              .mat-mdc-form-field-error-wrapper {
                font-size: 12px !important;
              }
            }
          }
        }
      }

      // Estilos para opciones de rol
      .role-option {
        display: flex;
        align-items: center;
        gap: 12px;
        padding: 8px 0;

        .role-icon {
          color: #017E84;
          font-size: 18px;
          width: 18px;
          height: 18px;
          background: rgba(1, 126, 132, 0.1);
          border-radius: 4px;
          padding: 4px;
          display: flex;
          align-items: center;
          justify-content: center;
        }

        .role-info {
          display: flex;
          flex-direction: column;
          gap: 2px;

          .role-name {
            font-weight: 600;
            color: #333;
            font-size: 14px;
          }

          .role-description {
            font-size: 12px;
            color: #666;
            font-style: italic;
          }
        }
      }

      // Password toggle button
      .password-toggle {
        color: #666;
        transition: all 0.3s ease;

        &:hover {
          color: #017E84;
          background: rgba(1, 126, 132, 0.1);
        }

        .mat-icon {
          font-size: 20px;
        }
      }
    }

    // ESTILOS ESPECÍFICOS PARA SOBRESCRIBIR LOS GLOBALES
    ::ng-deep .user-modal {
      mat-form-field.mat-mdc-form-field {
        .mat-mdc-form-field-label {
          position: absolute !important;
          top: -8px !important;
          left: 12px !important;
          background: #ffffff !important;
          padding: 0 4px !important;
          font-size: 12px !important;
          font-weight: 600 !important;
          color: #017E84 !important;
          z-index: 1 !important;
          transform: none !important;
          transform-origin: unset !important;
          
          &.mat-mdc-form-field-label-filled,
          &.mat-mdc-form-field-label-floating,
          &.mdc-floating-label--float-above,
          &.mat-form-field-label-filled,
          &.mat-form-field-label-floating {
            position: absolute !important;
            top: -8px !important;
            left: 12px !important;
            background: #ffffff !important;
            padding: 0 4px !important;
            font-size: 12px !important;
            font-weight: 600 !important;
            color: #017E84 !important;
            z-index: 1 !important;
            transform: none !important;
            transform-origin: unset !important;
          }
        }

        .mat-mdc-text-field-wrapper {
          background: #ffffff !important;
          border: 1px solid #e2e8f0 !important;
          border-radius: 8px !important;
          padding: 0 !important;
          min-height: 56px !important;
          position: relative !important;
        }

        .mat-mdc-form-field-infix {
          padding: 16px 12px 8px 12px !important;
          min-height: auto !important;
          display: block !important;
        }

        .mat-mdc-input-element {
          color: #333 !important;
          font-size: 16px !important;
          padding: 4px 0 !important;
          margin: 0 !important;
          border: none !important;
          background: transparent !important;
          outline: none !important;
          
          &::placeholder {
            color: #a0aec0 !important;
            font-style: italic !important;
          }
        }

        &.mat-focused {
          .mat-mdc-text-field-wrapper {
            border-color: #017E84 !important;
            border-width: 2px !important;
            box-shadow: 0 0 0 3px rgba(1, 126, 132, 0.1) !important;
          }
          
          .mat-mdc-form-field-label {
            color: #017E84 !important;
            position: absolute !important;
            top: -8px !important;
            left: 12px !important;
            background: #ffffff !important;
            padding: 0 4px !important;
            font-size: 12px !important;
            font-weight: 600 !important;
            z-index: 1 !important;
            transform: none !important;
          }
        }
      }
    }

    // ESTILOS ULTRA ESPECÍFICOS PARA FORZAR LA CORRECCIÓN
    .user-modal {
      ::ng-deep mat-form-field {
        .mat-mdc-form-field-label,
        .mdc-floating-label,
        .mat-mdc-form-field-label-wrapper {
          position: absolute !important;
          top: -8px !important;
          left: 12px !important;
          background: #ffffff !important;
          padding: 0 4px !important;
          font-size: 12px !important;
          font-weight: 600 !important;
          color: #017E84 !important;
          z-index: 1 !important;
          transform: none !important;
          transform-origin: unset !important;
          transition: none !important;
          
          &.mat-mdc-form-field-label-filled,
          &.mat-mdc-form-field-label-floating,
          &.mdc-floating-label--float-above,
          &.mat-form-field-label-filled,
          &.mat-form-field-label-floating,
          &.mdc-floating-label {
            position: absolute !important;
            top: -8px !important;
            left: 12px !important;
            background: #ffffff !important;
            padding: 0 4px !important;
            font-size: 12px !important;
            font-weight: 600 !important;
            color: #017E84 !important;
            z-index: 1 !important;
            transform: none !important;
            transform-origin: unset !important;
            transition: none !important;
          }
        }

        .mat-mdc-text-field-wrapper {
          background: #ffffff !important;
          border: 1px solid #e2e8f0 !important;
          border-radius: 8px !important;
          padding: 0 !important;
          min-height: 56px !important;
          position: relative !important;
        }

        .mat-mdc-form-field-infix {
          padding: 16px 12px 8px 12px !important;
          min-height: auto !important;
          display: block !important;
        }

        .mat-mdc-input-element {
          color: #333 !important;
          font-size: 16px !important;
          padding: 4px 0 !important;
          margin: 0 !important;
          border: none !important;
          background: transparent !important;
          outline: none !important;
          
          &::placeholder {
            color: #a0aec0 !important;
            font-style: italic !important;
          }
        }

        &.mat-focused {
          .mat-mdc-text-field-wrapper {
            border-color: #017E84 !important;
            border-width: 2px !important;
            box-shadow: 0 0 0 3px rgba(1, 126, 132, 0.1) !important;
          }
        }
      }
    }

    .modal-actions {
      background: #f5f7fa;
      padding: var(--spacing-lg) var(--spacing-xl);
      border-top: 1px solid #e2e8f0;
      display: flex;
      justify-content: flex-end;
      gap: var(--spacing-md);
      position: relative;
      z-index: 2;

      .cancel-btn {
        min-width: 120px;
        padding: 12px 24px;
        border-radius: 8px;
        font-weight: 600;
        font-size: 14px;
        transition: all 0.3s ease;
        display: flex;
        align-items: center;
        justify-content: center;
        gap: 8px;
        background: #ffffff;
        color: #666;
        border: 1px solid #e2e8f0;

        &:hover {
          background: #f8f9fa;
          border-color: #d1d5db;
        }
      }

      .save-btn {
        min-width: 120px;
        padding: 12px 24px;
        border-radius: 8px;
        font-weight: 600;
        font-size: 14px;
        transition: all 0.3s ease;
        display: flex;
        align-items: center;
        justify-content: center;
        gap: 8px;
        background: linear-gradient(135deg, #017E84, #20C997);
        color: white;
        border: none;
        box-shadow: 0 2px 8px rgba(1, 126, 132, 0.3);

        &:hover:not(:disabled) {
          background: linear-gradient(135deg, #015a5e, #017E84);
          transform: translateY(-2px);
          box-shadow: 0 4px 12px rgba(1, 126, 132, 0.4);
        }

        &:disabled {
          background: #d1d5db;
          color: #9ca3af;
          cursor: not-allowed;
          transform: none;
          box-shadow: none;
        }
      }
    }

    // Estilos para checkbox y texto
    .checkbox-container {
      margin-top: var(--spacing-lg);
      padding: var(--spacing-lg);
      background: #f8f9fa;
      border-radius: 8px;
      border: 1px solid #e2e8f0;

      .status-checkbox {
        ::ng-deep .mat-mdc-checkbox {
          .mat-mdc-checkbox-label {
            display: flex;
            align-items: center;
            gap: var(--spacing-sm);
            font-size: 16px;
            font-weight: 600;
            color: #333;
            line-height: 1.5;
          }
        }
      }

      .checkbox-label {
        display: flex;
        align-items: center;
        gap: 8px;
        font-size: 16px;
        font-weight: 600;
        color: #333;

        mat-icon {
          color: #017E84;
          font-size: 20px;
          width: 20px;
          height: 20px;
        }

        .checkbox-text {
          font-size: 16px;
          font-weight: 600;
          color: #333;
          line-height: 1.5;
        }
      }

      .checkbox-hint {
        margin: var(--spacing-sm) 0 0 0;
        font-size: 14px;
        color: #666;
        line-height: 1.4;
        font-style: italic;
      }
    }

    // Responsive design
    @media (max-width: 768px) {
      .modal-container {
        max-width: 95vw;
        max-height: 95vh;
        margin: var(--spacing-md);
      }

      .modal-header {
        padding: var(--spacing-lg);

        .header-content {
          .header-text {
            .modal-title {
              font-size: 20px;
            }

            .modal-subtitle {
              font-size: 13px;
            }
          }
        }
      }

      .modal-content {
        padding: var(--spacing-lg);
      }

      .modal-actions {
        padding: var(--spacing-md) var(--spacing-lg);
        flex-direction: column;

        .cancel-btn,
        .save-btn {
          width: 100%;
        }
      }
    }

    @media (max-width: 480px) {
      .modal-overlay {
        padding: var(--spacing-sm);
      }

      .modal-header {
        .header-content {
          gap: var(--spacing-sm);

          .header-icon {
            font-size: 24px;
            width: 24px;
            height: 24px;
          }
        }
      }
    }
  `]
})
export class UserDialogComponent implements OnInit {
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

  getFormProgress(): number {
    const totalFields = this.userForm.controls;
    const validFields = Object.values(totalFields).filter(control => control.valid && control.touched).length;
    const totalFieldsCount = Object.keys(totalFields).length;
    return Math.round((validFields / totalFieldsCount) * 100);
  }
}