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
  companyForm: FormGroup;
  isLoading = false;
  showDialog = false;
  
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
    
    this.companyForm = this.fb.group({
      // Datos de la empresa
      nombre: ['', [Validators.required, Validators.minLength(2)]],
      razonSocial: ['', [Validators.required]],
      nit: ['', [Validators.required]],
      dui: [''],
      telefono: [''],
      email: ['', [Validators.required, Validators.email]],
      direccion: [''],
      ciudad: ['San Salvador'],
      tipoEmpresa: ['retail', [Validators.required]],
      contactoPrincipal: [''],
      limiteCredito: [0],
      subscriptionPlan: ['basic'],
      maxUsers: [5],
      maxProducts: [1000],
      maxSalesPerMonth: [500],
      // Datos del usuario administrador
      admin_username: ['', [Validators.required, Validators.minLength(3)]],
      admin_name: ['', [Validators.required, Validators.minLength(2)]],
      admin_email: ['', [Validators.required, Validators.email]],
      admin_password: ['', [Validators.required, Validators.minLength(6)]]
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
    this.showDialog = true;
    this.companyForm.reset();
    this.companyForm.patchValue({
      ciudad: 'San Salvador',
      tipoEmpresa: 'retail',
      limiteCredito: 0,
      subscriptionPlan: 'basic',
      maxUsers: 5,
      maxProducts: 1000,
      maxSalesPerMonth: 500
    });
  }

  closeDialog(): void {
    this.showDialog = false;
    this.companyForm.reset();
  }

  createCompany(): void {
    if (this.companyForm.invalid) {
      Object.keys(this.companyForm.controls).forEach(key => {
        this.companyForm.get(key)?.markAsTouched();
      });
      this.toastr.warning('Por favor completa todos los campos requeridos');
      return;
    }

    const formValue = this.companyForm.value;
    const payload = {
      company: {
        nombre: formValue.nombre,
        razonSocial: formValue.razonSocial,
        nit: formValue.nit,
        dui: formValue.dui || null,
        telefono: formValue.telefono || null,
        email: formValue.email,
        direccion: formValue.direccion || null,
        ciudad: formValue.ciudad,
        pais: 'El Salvador',
        tipoEmpresa: formValue.tipoEmpresa,
        contactoPrincipal: formValue.contactoPrincipal || null,
        limiteCredito: formValue.limiteCredito || 0,
        subscriptionPlan: formValue.subscriptionPlan,
        maxUsers: formValue.maxUsers,
        maxProducts: formValue.maxProducts,
        maxSalesPerMonth: formValue.maxSalesPerMonth
      },
      admin_username: formValue.admin_username,
      admin_name: formValue.admin_name,
      admin_email: formValue.admin_email,
      admin_password: formValue.admin_password
    };

    this.isLoading = true;
    this.http.post<any>(this.api, payload).subscribe({
      next: (response) => {
        this.toastr.success('Empresa creada exitosamente');
        this.closeDialog();
        this.loadEmpresas();
        this.isLoading = false;
      },
      error: (err) => {
        console.error('Error creando empresa:', err);
        const errorMessage = err.error?.detail || err.error?.message || 'Error al crear empresa';
        this.toastr.error(errorMessage);
        this.isLoading = false;
      }
    });
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
    if (this.filteredEmpresas.length === 0) {
      this.toastr.warning('No hay empresas para generar reporte');
      return;
    }

    // Preguntar al usuario qué formato desea
    const format = prompt('¿Qué formato desea para el reporte?\n\n1. Escriba "PDF" para formato impreso\n2. Escriba "EXCEL" para tabla de datos');
    
    if (!format) return;
    
    const formatUpper = format.toUpperCase().trim();
    if (formatUpper === 'PDF' || formatUpper === '1') {
      this.generarPDFReporte();
    } else if (formatUpper === 'EXCEL' || formatUpper === '2') {
      this.generarExcelReporte();
    } else {
      this.toastr.warning('Formato no válido. Seleccione PDF o EXCEL');
    }
  }

  exportarDatos(): void {
    if (this.filteredEmpresas.length === 0) {
      this.toastr.warning('No hay empresas para exportar');
      return;
    }

    // Preguntar al usuario qué formato desea
    const format = prompt('¿Qué formato desea para la exportación?\n\n1. Escriba "PDF" para formato impreso\n2. Escriba "EXCEL" para tabla de datos');
    
    if (!format) return;
    
    const formatUpper = format.toUpperCase().trim();
    if (formatUpper === 'PDF' || formatUpper === '1') {
      this.exportarPDF();
    } else if (formatUpper === 'EXCEL' || formatUpper === '2') {
      this.exportarExcel();
    } else {
      this.toastr.warning('Formato no válido. Seleccione PDF o EXCEL');
    }
  }

  private generarPDFReporte(): void {
    // Crear contenido HTML para el PDF
    let htmlContent = `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="UTF-8">
        <style>
          body { font-family: Arial, sans-serif; padding: 20px; }
          h1 { color: #017E84; border-bottom: 3px solid #20C997; padding-bottom: 10px; }
          h2 { color: #333; margin-top: 30px; }
          table { width: 100%; border-collapse: collapse; margin-top: 20px; }
          th { background-color: #017E84; color: white; padding: 12px; text-align: left; }
          td { padding: 10px; border-bottom: 1px solid #ddd; }
          .stats { display: flex; justify-content: space-around; margin: 20px 0; }
          .stat-box { background: #f8f9fa; padding: 15px; border-radius: 8px; text-align: center; }
          .stat-number { font-size: 24px; font-weight: bold; color: #017E84; }
          .stat-label { color: #666; margin-top: 5px; }
        </style>
      </head>
      <body>
        <h1>📊 REPORTE DE EMPRESAS CLIENTES</h1>
        <p><strong>Fecha:</strong> ${new Date().toLocaleDateString('es-SV', { year: 'numeric', month: 'long', day: 'numeric' })}</p>
        
        <div class="stats">
          <div class="stat-box">
            <div class="stat-number">${this.filteredEmpresas.length}</div>
            <div class="stat-label">Total Empresas</div>
          </div>
          <div class="stat-box">
            <div class="stat-number">${this.empresasActivas}</div>
            <div class="stat-label">Empresas Activas</div>
          </div>
          <div class="stat-box">
            <div class="stat-number">${this.filteredEmpresas.filter(e => e.estado === 'inactiva').length}</div>
            <div class="stat-label">Empresas Inactivas</div>
          </div>
        </div>

        <h2>📋 Detalle de Empresas</h2>
        <table>
          <thead>
            <tr>
              <th>#</th>
              <th>Empresa</th>
              <th>NIT</th>
              <th>Tipo</th>
              <th>Estado</th>
              <th>Email</th>
              <th>Crédito</th>
              <th>Saldo</th>
            </tr>
          </thead>
          <tbody>
    `;

    this.filteredEmpresas.forEach((empresa, index) => {
      htmlContent += `
            <tr>
              <td>${index + 1}</td>
              <td><strong>${empresa.nombre}</strong><br><small>${empresa.razonSocial}</small></td>
              <td>${empresa.nit}</td>
              <td>${this.getTipoEmpresaLabel(empresa.tipoEmpresa)}</td>
              <td><span style="color: ${this.getStatusColor(empresa.estado)};">${empresa.estado.toUpperCase()}</span></td>
              <td>${empresa.email}</td>
              <td>${this.formatCurrency(empresa.limiteCredito)}</td>
              <td>${this.formatCurrency(empresa.saldoActual)}</td>
            </tr>
      `;
    });

    htmlContent += `
          </tbody>
        </table>
      </body>
      </html>
    `;

    // Crear ventana e imprimir
    const printWindow = window.open('', '', 'width=800,height=600');
    if (printWindow) {
      printWindow.document.write(htmlContent);
      printWindow.document.close();
      printWindow.focus();
      setTimeout(() => {
        printWindow.print();
      }, 250);
      this.toastr.success('Reporte PDF generado');
    }
  }

  private generarExcelReporte(): void {
    // Crear CSV que se puede abrir en Excel
    let csvContent = 'Número,Empresa,Razón Social,NIT,Tipo,Estado,Email,Teléfono,Crédito Límite,Saldo Actual\n';
    
    this.filteredEmpresas.forEach((empresa, index) => {
      csvContent += `${index + 1},"${empresa.nombre}","${empresa.razonSocial}","${empresa.nit}","${this.getTipoEmpresaLabel(empresa.tipoEmpresa)}","${empresa.estado}","${empresa.email}","${empresa.telefono || 'N/A'}","${empresa.limiteCredito}","${empresa.saldoActual}"\n`;
    });

    this.downloadFile(csvContent, 'reporte_empresas', 'csv');
    this.toastr.success('Reporte Excel generado exitosamente');
  }

  private exportarPDF(): void {
    // Similar a generarPDFReporte pero más compacto
    this.generarPDFReporte();
  }

  private exportarExcel(): void {
    // Crear CSV para Excel
    let csvContent = 'Nombre,Razón Social,NIT,Tipo,Estado,Email,Teléfono,Crédito,Saldo\n';
    
    this.filteredEmpresas.forEach(empresa => {
      csvContent += `"${empresa.nombre}","${empresa.razonSocial}","${empresa.nit}","${this.getTipoEmpresaLabel(empresa.tipoEmpresa)}","${empresa.estado}","${empresa.email}","${empresa.telefono}","${empresa.limiteCredito}","${empresa.saldoActual}"\n`;
    });

    this.downloadFile(csvContent, 'empresas_exportadas', 'csv');
    this.toastr.success('Datos exportados exitosamente');
  }

  private downloadFile(content: string, filename: string, type: string): void {
    const blob = new Blob([content], { 
      type: type === 'csv' ? 'text/csv;charset=utf-8;' : 'text/plain;charset=utf-8' 
    });
    const url = window.URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `${filename}_${new Date().getTime()}.${type}`;
    link.click();
    window.URL.revokeObjectURL(url);
  }

  private getStatusColor(estado: string): string {
    switch (estado) {
      case 'activa': return '#4caf50';
      case 'inactiva': return '#f44336';
      case 'suspendida': return '#ff9800';
      default: return '#757575';
    }
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
