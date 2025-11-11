import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormBuilder, FormGroup, Validators } from '@angular/forms';
import { MatCardModule } from '@angular/material/card';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatTableModule } from '@angular/material/table';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { MatDialogModule, MatDialog } from '@angular/material/dialog';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatSnackBarModule } from '@angular/material/snack-bar';
import { MatChipsModule } from '@angular/material/chips';
import { MatBadgeModule } from '@angular/material/badge';
import { MatSlideToggleModule } from '@angular/material/slide-toggle';
import { MatTabsModule } from '@angular/material/tabs';
import { MatExpansionModule } from '@angular/material/expansion';
import { MatTooltipModule } from '@angular/material/tooltip';
import { ToastrService } from 'ngx-toastr';
import { Subject, takeUntil } from 'rxjs';

interface UsuarioSudo {
  id: number;
  username: string;
  email: string;
  nombre: string;
  apellido: string;
  telefono: string;
  permisos: string[];
  fechaCreacion: string;
  ultimoAcceso: string;
  estado: 'activo' | 'inactivo' | 'suspendido';
  intentosLogin: number;
  ip: string;
  sistemaOperativo: string;
  navegador: string;
}

interface PermisoCritico {
  id: string;
  nombre: string;
  descripcion: string;
  categoria: string;
  nivel: 'bajo' | 'medio' | 'alto' | 'critico';
  activo: boolean;
}

interface ActividadSudo {
  id: number;
  usuario: string;
  accion: string;
  modulo: string;
  detalle: string;
  fecha: string;
  ip: string;
  resultado: 'exitoso' | 'fallido' | 'bloqueado';
}

@Component({
  selector: 'app-usuario-sudo',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    MatCardModule,
    MatButtonModule,
    MatIconModule,
    MatTableModule,
    MatFormFieldModule,
    MatInputModule,
    MatSelectModule,
    MatDialogModule,
    MatProgressSpinnerModule,
    MatSnackBarModule,
    MatChipsModule,
    MatBadgeModule,
    MatSlideToggleModule,
    MatTabsModule,
    MatExpansionModule,
    MatTooltipModule
  ],
  templateUrl: './usuario-sudo.component.html',
  styleUrls: ['./usuario-sudo.component.scss']
})
export class UsuarioSudoComponent implements OnInit, OnDestroy {
  usuariosSudo: UsuarioSudo[] = [];
  permisosCriticos: PermisoCritico[] = [];
  actividadReciente: ActividadSudo[] = [];
  
  usuarioForm: FormGroup;
  isLoading = false;
  
  displayedColumnsUsuarios: string[] = ['usuario', 'nombre', 'permisos', 'ultimoAcceso', 'estado', 'acciones'];
  displayedColumnsActividad: string[] = ['fecha', 'usuario', 'accion', 'modulo', 'ip', 'resultado'];
  
  nivelesPermiso = [
    { value: 'bajo', label: 'Bajo', color: 'primary' },
    { value: 'medio', label: 'Medio', color: 'accent' },
    { value: 'alto', label: 'Alto', color: 'warn' },
    { value: 'critico', label: 'Crítico', color: 'warn' }
  ];

  private destroy$ = new Subject<void>();

  constructor(
    private fb: FormBuilder,
    private dialog: MatDialog,
    private toastr: ToastrService
  ) {
    this.usuarioForm = this.fb.group({
      username: ['', [Validators.required, Validators.minLength(3)]],
      email: ['', [Validators.required, Validators.email]],
      nombre: ['', [Validators.required]],
      apellido: ['', [Validators.required]],
      telefono: ['', [Validators.required]],
      permisos: [[], [Validators.required]]
    });
  }

  ngOnInit(): void {
    this.loadUsuariosSudo();
    this.loadPermisosCriticos();
    this.loadActividadReciente();
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  private loadUsuariosSudo(): void {
    this.isLoading = true;
    
    // Datos de ejemplo (en producción vendrían del backend)
    setTimeout(() => {
      this.usuariosSudo = [
        {
          id: 1,
          username: 'sudo.admin',
          email: 'sudo@superpos.com',
          nombre: 'Super',
          apellido: 'Administrador',
          telefono: '7000-0000',
          permisos: ['system.full', 'database.admin', 'user.manage', 'config.edit'],
          fechaCreacion: '2024-01-01',
          ultimoAcceso: '2024-10-13 22:30:15',
          estado: 'activo',
          intentosLogin: 0,
          ip: '192.168.1.100',
          sistemaOperativo: 'Windows 11',
          navegador: 'Chrome 118'
        },
        {
          id: 2,
          username: 'backup.manager',
          email: 'backup@superpos.com',
          nombre: 'Backup',
          apellido: 'Manager',
          telefono: '7000-0001',
          permisos: ['database.backup', 'system.monitor', 'logs.read'],
          fechaCreacion: '2024-02-15',
          ultimoAcceso: '2024-10-13 20:15:30',
          estado: 'activo',
          intentosLogin: 2,
          ip: '192.168.1.101',
          sistemaOperativo: 'Ubuntu 22.04',
          navegador: 'Firefox 118'
        }
      ];
      
      this.isLoading = false;
    }, 800);
  }

  private loadPermisosCriticos(): void {
    this.permisosCriticos = [
      {
        id: 'system.full',
        nombre: 'Acceso Total al Sistema',
        descripcion: 'Acceso completo a todas las funciones del sistema',
        categoria: 'Sistema',
        nivel: 'critico',
        activo: true
      },
      {
        id: 'database.admin',
        nombre: 'Administrador de Base de Datos',
        descripcion: 'Crear, modificar y eliminar tablas y datos',
        categoria: 'Base de Datos',
        nivel: 'critico',
        activo: true
      },
      {
        id: 'user.manage',
        nombre: 'Gestión de Usuarios',
        descripcion: 'Crear, editar y eliminar usuarios del sistema',
        categoria: 'Usuarios',
        nivel: 'alto',
        activo: true
      },
      {
        id: 'config.edit',
        nombre: 'Configuración del Sistema',
        descripcion: 'Modificar configuraciones críticas del sistema',
        categoria: 'Configuración',
        nivel: 'alto',
        activo: true
      },
      {
        id: 'database.backup',
        nombre: 'Respaldos de Base de Datos',
        descripcion: 'Crear y restaurar respaldos de la base de datos',
        categoria: 'Base de Datos',
        nivel: 'medio',
        activo: true
      },
      {
        id: 'system.monitor',
        nombre: 'Monitoreo del Sistema',
        descripcion: 'Ver métricas y estado del sistema',
        categoria: 'Monitoreo',
        nivel: 'bajo',
        activo: true
      }
    ];
  }

  private loadActividadReciente(): void {
    this.actividadReciente = [
      {
        id: 1,
        usuario: 'sudo.admin',
        accion: 'LOGIN_SUCCESS',
        modulo: 'Authentication',
        detalle: 'Inicio de sesión exitoso',
        fecha: '2024-10-13 22:30:15',
        ip: '192.168.1.100',
        resultado: 'exitoso'
      },
      {
        id: 2,
        usuario: 'backup.manager',
        accion: 'DATABASE_BACKUP',
        modulo: 'Database',
        detalle: 'Respaldo automático de base de datos',
        fecha: '2024-10-13 21:00:00',
        ip: '192.168.1.101',
        resultado: 'exitoso'
      },
      {
        id: 3,
        usuario: 'sudo.admin',
        accion: 'USER_CREATE',
        modulo: 'User Management',
        detalle: 'Creación de nuevo usuario: cajero2',
        fecha: '2024-10-13 20:45:30',
        ip: '192.168.1.100',
        resultado: 'exitoso'
      },
      {
        id: 4,
        usuario: 'unknown.user',
        accion: 'LOGIN_FAILED',
        modulo: 'Authentication',
        detalle: 'Intento de acceso fallido - credenciales inválidas',
        fecha: '2024-10-13 19:30:22',
        ip: '203.0.113.45',
        resultado: 'bloqueado'
      }
    ];
  }

  getPermisoNivel(permisoId: string): string {
    const permiso = this.permisosCriticos.find(p => p.id === permisoId);
    return permiso?.nivel || 'bajo';
  }

  getPermisoColor(nivel: string): string {
    const nivelObj = this.nivelesPermiso.find(n => n.value === nivel);
    return nivelObj?.color || 'primary';
  }

  getResultadoColor(resultado: string): string {
    switch(resultado) {
      case 'exitoso': return 'primary';
      case 'fallido': return 'warn';
      case 'bloqueado': return 'warn';
      default: return 'primary';
    }
  }

  getResultadoIcon(resultado: string): string {
    switch(resultado) {
      case 'exitoso': return 'check_circle';
      case 'fallido': return 'error';
      case 'bloqueado': return 'block';
      default: return 'help';
    }
  }

  formatDateTime(dateTime: string): string {
    return new Date(dateTime).toLocaleString('es-ES', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit'
    });
  }

  crearUsuarioSudo(): void {
    if (this.usuarioForm.valid) {
      const formData = this.usuarioForm.value;
      this.toastr.success(`Usuario SUDO creado: ${formData.username}`, 'Usuario Creado');
      this.usuarioForm.reset();
    } else {
      this.toastr.error('Por favor complete todos los campos requeridos', 'Formulario Inválido');
    }
  }

  editarUsuario(usuario: UsuarioSudo): void {
    this.toastr.info(`Editando usuario SUDO: ${usuario.username}`, 'Editar Usuario');
  }

  cambiarEstadoUsuario(usuario: UsuarioSudo): void {
    const nuevoEstado = usuario.estado === 'activo' ? 'inactivo' : 'activo';
    this.toastr.success(`Usuario ${usuario.username} ${nuevoEstado}`, 'Estado Actualizado');
  }

  revocarPermisos(usuario: UsuarioSudo): void {
    this.toastr.warning(`Permisos revocados para: ${usuario.username}`, 'Permisos Revocados');
  }

  resetearPassword(usuario: UsuarioSudo): void {
    this.toastr.info(`Password reseteado para: ${usuario.username}`, 'Password Reset');
  }

  togglePermiso(permiso: PermisoCritico): void {
    permiso.activo = !permiso.activo;
    const estado = permiso.activo ? 'activado' : 'desactivado';
    this.toastr.info(`Permiso ${permiso.nombre} ${estado}`, 'Permiso Actualizado');
  }

  generarReporteSeguridad(): void {
    this.toastr.info('Generando reporte de seguridad...', 'Reporte de Seguridad');
  }

  exportarLogs(): void {
    this.toastr.info('Exportando logs de actividad...', 'Exportar Logs');
  }

  bloquearIP(ip: string): void {
    this.toastr.warning(`IP bloqueada: ${ip}`, 'IP Bloqueada');
  }
}
