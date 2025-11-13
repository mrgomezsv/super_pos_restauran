import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatButtonModule } from '@angular/material/button';
import { MatCardModule } from '@angular/material/card';
import { Firestore, doc, setDoc, getDoc, serverTimestamp } from '@angular/fire/firestore';
import { ToastrService } from 'ngx-toastr';

@Component({
  selector: 'app-create-users',
  standalone: true,
  imports: [CommonModule, MatButtonModule, MatCardModule],
  template: `
    <div style="padding: 24px;">
      <mat-card>
        <mat-card-header>
          <mat-card-title>Crear Usuarios en Firestore</mat-card-title>
        </mat-card-header>
        <mat-card-content>
          <p>Este componente creará los usuarios admin&#64;example.com y cajero1&#64;example.com en Firestore.</p>
          <button mat-raised-button color="primary" (click)="createUsers()" [disabled]="loading">
            {{ loading ? 'Creando...' : 'Crear Usuarios' }}
          </button>
          <div *ngIf="message" [style.color]="message.includes('✅') ? 'green' : 'red'" style="margin-top: 16px;">
            {{ message }}
          </div>
        </mat-card-content>
      </mat-card>
    </div>
  `
})
export class CreateUsersComponent implements OnInit {
  loading = false;
  message = '';

  constructor(
    private firestore: Firestore,
    private toastr: ToastrService
  ) {}

  ngOnInit(): void {
    // Auto-ejecutar al cargar
    this.createUsers();
  }

  async createUsers() {
    this.loading = true;
    this.message = '';

    try {
      // Verificar y crear usuario admin@example.com
      const adminDocRef = doc(this.firestore, 'accounts', 'skJIaGpTLgZuB5OeRAFnwW2R9QP2');
      const adminSnap = await getDoc(adminDocRef);
      
      if (!adminSnap.exists()) {
        await setDoc(adminDocRef, {
          id: 'skJIaGpTLgZuB5OeRAFnwW2R9QP2',
          email: 'admin@example.com',
          name: 'Fernando',
          lastName: 'Melgar',
          fullName: 'Fernando Melgar',
          username: 'admin',
          role: 'admin',
          status: 'active',
          isActive: true,
          companies: [],
          permissions: [],
          createdAt: serverTimestamp(),
          updatedAt: serverTimestamp()
        });
        this.message += '✅ Usuario admin@example.com creado en Firestore\n';
      } else {
        this.message += 'ℹ️ Usuario admin@example.com ya existe en Firestore\n';
      }

      // Verificar y crear usuario cajero1@example.com
      const cajeroDocRef = doc(this.firestore, 'accounts', 'eBRK7EnM4PebOzZIPWxF5FrhpiL2');
      const cajeroSnap = await getDoc(cajeroDocRef);
      
      if (!cajeroSnap.exists()) {
        await setDoc(cajeroDocRef, {
          id: 'eBRK7EnM4PebOzZIPWxF5FrhpiL2',
          email: 'cajero1@example.com',
          name: 'Maria',
          lastName: 'Perez',
          fullName: 'Maria Perez',
          username: 'cajero1',
          role: 'cashier',
          status: 'active',
          isActive: true,
          companies: [],
          permissions: [],
          createdAt: serverTimestamp(),
          updatedAt: serverTimestamp()
        });
        this.message += '✅ Usuario cajero1@example.com creado en Firestore\n';
      } else {
        this.message += 'ℹ️ Usuario cajero1@example.com ya existe en Firestore\n';
      }

      this.toastr.success('Proceso completado');
    } catch (error: any) {
      console.error('Error creando usuarios:', error);
      this.message = '❌ Error: ' + (error.message || 'Error desconocido');
      this.toastr.error('Error al crear usuarios: ' + error.message);
    } finally {
      this.loading = false;
    }
  }
}

