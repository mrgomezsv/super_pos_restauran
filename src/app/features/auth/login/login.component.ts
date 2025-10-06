import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, Validators, ReactiveFormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { MatCardModule } from '@angular/material/card';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { ToastrService } from 'ngx-toastr';
import { NgxSpinnerService } from 'ngx-spinner';

import { AuthService } from '../../../core/services/auth.service';
import { LoginRequest } from '../../../core/models/user.model';

@Component({
  selector: 'app-login',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    MatCardModule,
    MatFormFieldModule,
    MatInputModule,
    MatButtonModule,
    MatIconModule,
    MatProgressSpinnerModule
  ],
  template: `
    <div class="login-container">
      <mat-card class="login-card">
        <mat-card-header>
          <mat-card-title class="login-title">
            <mat-icon class="title-icon">point_of_sale</mat-icon>
            Super POS
          </mat-card-title>
          <mat-card-subtitle>Iniciar Sesión</mat-card-subtitle>
        </mat-card-header>

        <mat-card-content>
          <form [formGroup]="loginForm" (ngSubmit)="onSubmit()" class="login-form">
            <mat-form-field appearance="outline" class="full-width">
              <mat-label>Usuario</mat-label>
              <input matInput formControlName="username" placeholder="Ingrese su usuario">
              <mat-icon matSuffix>person</mat-icon>
              <mat-error *ngIf="loginForm.get('username')?.hasError('required')">
                El usuario es requerido
              </mat-error>
            </mat-form-field>

            <mat-form-field appearance="outline" class="full-width">
              <mat-label>Contraseña</mat-label>
              <input matInput 
                     [type]="hidePassword ? 'password' : 'text'" 
                     formControlName="password" 
                     placeholder="Ingrese su contraseña">
              <button mat-icon-button matSuffix 
                      type="button"
                      (click)="hidePassword = !hidePassword" 
                      [attr.aria-label]="'Ocultar contraseña'" 
                      [attr.aria-pressed]="hidePassword">
                <mat-icon>{{hidePassword ? 'visibility_off' : 'visibility'}}</mat-icon>
              </button>
              <mat-error *ngIf="loginForm.get('password')?.hasError('required')">
                La contraseña es requerida
              </mat-error>
            </mat-form-field>

            <button mat-raised-button 
                    color="primary" 
                    type="submit" 
                    class="login-button full-width"
                    [disabled]="loginForm.invalid || isLoading">
              <mat-spinner *ngIf="isLoading" diameter="20"></mat-spinner>
              <span *ngIf="!isLoading">Iniciar Sesión</span>
            </button>
          </form>
        </mat-card-content>

        <mat-card-footer class="login-footer">
          <p class="footer-text">
            Sistema de Punto de Ventas para Supermercado
          </p>
        </mat-card-footer>
      </mat-card>
    </div>
  `,
  styles: [`
    .login-container {
      display: flex;
      justify-content: center;
      align-items: center;
      min-height: 100vh;
      background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
      padding: 20px;
    }

    .login-card {
      width: 100%;
      max-width: 400px;
      padding: 20px;
      box-shadow: 0 8px 32px rgba(0, 0, 0, 0.1);
      border-radius: 16px;
    }

    .login-title {
      display: flex;
      align-items: center;
      justify-content: center;
      font-size: 2rem;
      font-weight: 600;
      color: #1976d2;
      margin-bottom: 8px;
    }

    .title-icon {
      font-size: 2.5rem;
      margin-right: 12px;
    }

    .login-form {
      display: flex;
      flex-direction: column;
      gap: 16px;
      margin-top: 24px;
    }

    .full-width {
      width: 100%;
    }

    .login-button {
      height: 48px;
      font-size: 16px;
      margin-top: 16px;
    }

    .login-footer {
      text-align: center;
      margin-top: 24px;
      padding: 16px;
    }

    .footer-text {
      color: #666;
      font-size: 14px;
      margin: 0;
    }

    mat-card-header {
      text-align: center;
    }

    mat-card-subtitle {
      color: #666;
      font-size: 16px;
    }
  `]
})
export class LoginComponent implements OnInit {
  loginForm: FormGroup;
  hidePassword = true;
  isLoading = false;

  constructor(
    private fb: FormBuilder,
    private authService: AuthService,
    private router: Router,
    private toastr: ToastrService,
    private spinner: NgxSpinnerService
  ) {
    this.loginForm = this.fb.group({
      username: ['', [Validators.required]],
      password: ['', [Validators.required]]
    });
  }

  ngOnInit() {
    // Si ya está autenticado, redirigir al POS
    if (this.authService.isAuthenticated()) {
      this.router.navigate(['/pos']);
    }
  }

  onSubmit() {
    if (this.loginForm.valid) {
      this.isLoading = true;
      this.spinner.show();

      const credentials: LoginRequest = this.loginForm.value;

      this.authService.login(credentials).subscribe({
        next: (response) => {
          this.isLoading = false;
          this.spinner.hide();
          this.toastr.success('Inicio de sesión exitoso', 'Bienvenido');
          this.router.navigate(['/pos']);
        },
        error: (error) => {
          this.isLoading = false;
          this.spinner.hide();
          this.toastr.error(
            error.error?.message || 'Error al iniciar sesión',
            'Error de autenticación'
          );
        }
      });
    }
  }
}
