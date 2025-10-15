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
import { ToastrService } from 'ngx-toastr';
import { Subject, takeUntil } from 'rxjs';
import { HttpClient } from '@angular/common/http';
import { environment } from '../../../../environments/environment';

interface EmpresaCliente {
  id: number;
  nombre: string;
  razonSocial: string;
  nit: string;
  dui: string;
  telefono: string;
  email: string;
  direccion: string;
  ciudad: string;
  pais: string;
  tipoEmpresa: string;
  estado: 'activa' | 'inactiva' | 'suspendida';
  fechaRegistro: string;
  contactoPrincipal: string;
  limiteCredito: number;
  saldoActual: number;
}

@Component({
  selector: 'app-empresas-clientes',
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
    MatBadgeModule
  ],
  templateUrl: './empresas-clientes.component.html',
  styleUrls: ['./empresas-clientes.component.scss']
})
export class EmpresasClientesComponent implements OnInit, OnDestroy {
  empresas: EmpresaCliente[] = [];
  filteredEmpresas: EmpresaCliente[] = [];
  searchForm: FormGroup;
  isLoading = false;
  
  displayedColumns: string[] = ['nombre', 'razonSocial', 'nit', 'contacto', 'estado', 'saldo', 'acciones'];
  
  tiposEmpresa = [
    { value: 'retail', label: 'Retail/Comercio' },
    { value: 'manufacturing', label: 'Manufactura' },
    { value: 'services', label: 'Servicios' },
    { value: 'restaurant', label: 'Restaurante' },
    { value: 'other', label: 'Otros' }
  ];
  
  estados = [
    { value: 'activa', label: 'Activa', color: 'primary' },
    { value: 'inactiva', label: 'Inactiva', color: 'warn' },
    { value: 'suspendida', label: 'Suspendida', color: 'accent' }
  ];

  private destroy$ = new Subject<void>();
  private readonly api = `${environment.apiUrl}/companies`;

  constructor(
    private fb: FormBuilder,
    private dialog: MatDialog,
    private toastr: ToastrService,
    private http: HttpClient
  ) {
    this.searchForm = this.fb.group({
      search: [''],
      tipoEmpresa: [''],
      estado: ['']
    });
  }

  ngOnInit(): void {
    this.loadEmpresas();
    this.setupSearch();
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  private setupSearch(): void {
    this.searchForm.valueChanges
      .pipe(takeUntil(this.destroy$))
      .subscribe(() => {
        this.filterEmpresas();
      });
  }

  private loadEmpresas(): void {
    this.isLoading = true;
    
    this.http.get<any[]>(`${this.api}?active_only=false`).subscribe({
      next: (data) => {
        this.empresas = data.map(c => ({
          id: c.id,
          nombre: c.nombre,
          razonSocial: c.razonSocial,
          nit: c.nit,
          dui: c.dui || '',
          telefono: c.telefono || '',
          email: c.email,
          direccion: c.direccion || '',
          ciudad: c.ciudad || '',
          pais: c.pais,
          tipoEmpresa: c.tipoEmpresa,
          estado: c.estado,
          fechaRegistro: c.fechaRegistro,
          contactoPrincipal: c.contactoPrincipal || '',
          limiteCredito: c.limiteCredito,
          saldoActual: c.saldoActual
        }));
        
        this.filteredEmpresas = [...this.empresas];
        this.isLoading = false;
      },
      error: (err) => {
        console.error('Error cargando empresas:', err);
        this.toastr.error('Error al cargar empresas cliente');
        this.isLoading = false;
      }
    });
  }

  private filterEmpresas(): void {
    const filters = this.searchForm.value;
    let filtered = [...this.empresas];

    if (filters.search) {
      const searchLower = filters.search.toLowerCase();
      filtered = filtered.filter(empresa =>
        empresa.nombre.toLowerCase().includes(searchLower) ||
        empresa.razonSocial.toLowerCase().includes(searchLower) ||
        empresa.nit.includes(searchLower) ||
        empresa.email.toLowerCase().includes(searchLower)
      );
    }

    if (filters.tipoEmpresa) {
      filtered = filtered.filter(empresa => empresa.tipoEmpresa === filters.tipoEmpresa);
    }

    if (filters.estado) {
      filtered = filtered.filter(empresa => empresa.estado === filters.estado);
    }

    this.filteredEmpresas = filtered;
  }

  getEstadoColor(estado: string): string {
    const estadoObj = this.estados.find(e => e.value === estado);
    return estadoObj?.color || 'primary';
  }

  getTipoEmpresaLabel(tipo: string): string {
    const tipoObj = this.tiposEmpresa.find(t => t.value === tipo);
    return tipoObj?.label || tipo;
  }

  formatCurrency(amount: number): string {
    return new Intl.NumberFormat('es-SV', {
      style: 'currency',
      currency: 'USD'
    }).format(amount);
  }

  nuevaEmpresa(): void {
    this.toastr.info('Funcionalidad en desarrollo', 'Nueva Empresa');
  }

  editarEmpresa(empresa: EmpresaCliente): void {
    this.toastr.info(`Editando empresa: ${empresa.nombre}`, 'Editar Empresa');
  }

  verDetalle(empresa: EmpresaCliente): void {
    this.toastr.info(`Viendo detalle de: ${empresa.nombre}`, 'Detalle Empresa');
  }

  cambiarEstado(empresa: EmpresaCliente): void {
    // Ciclar estados: activa -> inactiva -> suspendida -> activa
    let nuevoEstado: string;
    if (empresa.estado === 'activa') nuevoEstado = 'inactiva';
    else if (empresa.estado === 'inactiva') nuevoEstado = 'suspendida';
    else nuevoEstado = 'activa';

    this.http.put(`${this.api}/${empresa.id}/status`, { estado: nuevoEstado }).subscribe({
      next: () => {
        this.toastr.success(`Estado cambiado a: ${nuevoEstado}`, 'Estado Actualizado');
        this.loadEmpresas();
      },
      error: (err) => {
        console.error('Error cambiando estado:', err);
        this.toastr.error('Error al cambiar estado');
      }
    });
  }

  generarReporte(): void {
    this.toastr.info('Generando reporte de empresas clientes...', 'Reporte');
  }

  exportarDatos(): void {
    this.toastr.info('Exportando datos de empresas...', 'Exportar');
  }

  get empresasActivas(): number {
    return this.filteredEmpresas.filter(e => e.estado === 'activa').length;
  }

  isSaldoAlto(empresa: EmpresaCliente): boolean {
    return empresa.saldoActual > empresa.limiteCredito * 0.8;
  }

  isSaldoMedio(empresa: EmpresaCliente): boolean {
    return empresa.saldoActual > empresa.limiteCredito * 0.5 && empresa.saldoActual <= empresa.limiteCredito * 0.8;
  }

  isEstadoActiva(empresa: EmpresaCliente): boolean {
    return empresa.estado === 'activa';
  }

  getPlayIcon(empresa: EmpresaCliente): string {
    return empresa.estado === 'activa' ? 'pause' : 'play_arrow';
  }

  getButtonColor(empresa: EmpresaCliente): string {
    return empresa.estado === 'activa' ? 'warn' : 'primary';
  }

  isEstadoSuspendida(estado: string): boolean {
    return estado === 'suspendida';
  }
}
