import { Component, OnInit, OnDestroy, HostListener, ViewChild, ElementRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, ReactiveFormsModule } from '@angular/forms';
import { Subject, takeUntil, debounceTime, distinctUntilChanged } from 'rxjs';
import { MatCardModule } from '@angular/material/card';
import { MatTableModule } from '@angular/material/table';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatDialogModule, MatDialog } from '@angular/material/dialog';
import { MatChipsModule } from '@angular/material/chips';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatTooltipModule } from '@angular/material/tooltip';
import { ToastrService } from 'ngx-toastr';
import * as XLSX from 'xlsx';
import { forkJoin, of } from 'rxjs';
import { switchMap, catchError } from 'rxjs/operators';

import { ProductService } from '../../core/services/product.service';
import { Product } from '../../core/models/product.model';
import { ProductDialogComponent } from './product-dialog/product-dialog.component';

@Component({
    selector: 'app-products',
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
        MatChipsModule,
        MatProgressSpinnerModule,
        MatTooltipModule,
        ProductDialogComponent
    ],
    templateUrl: './products.component.html',
    styleUrls: ['./products.component.scss']
})
export class ProductsComponent implements OnInit, OnDestroy {
  products: Product[] = [];
  allProducts: Product[] = []; // Lista completa para filtrar
  displayedColumns: string[] = ['code', 'name', 'presentation', 'unitOfMeasure', 'status', 'actions'];
  isLoading = true;
  isImporting = false;
  filtersForm: FormGroup;
  @ViewChild('fileInput') fileInput!: ElementRef<HTMLInputElement>;
  private destroy$ = new Subject<void>();

  // Dropdown states
  isStatusDropdownOpen = false;

  constructor(
    private productService: ProductService,
    private dialog: MatDialog,
    private fb: FormBuilder,
    private toastr: ToastrService
  ) {
    this.filtersForm = this.fb.group({
      search: [''],
      isActive: ['']
    });
  }

  ngOnInit(): void {
    this.loadProducts();

    // Búsqueda en tiempo real
    this.filtersForm.get('search')?.valueChanges.pipe(
      debounceTime(300),
      distinctUntilChanged(),
      takeUntil(this.destroy$)
    ).subscribe(() => {
      this.applyFilters();
    });

    // Filtro de estado en tiempo real
    this.filtersForm.get('isActive')?.valueChanges.pipe(
      takeUntil(this.destroy$)
    ).subscribe(() => {
      this.applyFilters();
    });
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  private loadProducts(): void {
    this.isLoading = true;
    
    // Usar getIngredients() para cargar desde Firestore
    this.productService.getIngredients()
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (products) => {
          this.allProducts = products;
          this.applyFilters(); // Aplicar filtros después de cargar
          this.isLoading = false;
        },
        error: (error) => {
          console.error('Error loading ingredients:', error);
          this.toastr.error('Error al cargar los ingredientes');
          this.isLoading = false;
        }
      });
  }

  applyFilters(): void {
    const filters = this.filtersForm.value;
    
    // Aplicar filtros sobre la lista completa
    let filtered = [...this.allProducts];
    
    if (filters.search) {
      const searchLower = filters.search.toLowerCase();
      filtered = filtered.filter(p => 
        p.name.toLowerCase().includes(searchLower) ||
        p.code.toLowerCase().includes(searchLower)
      );
    }
    
    if (filters.isActive !== undefined && filters.isActive !== null && filters.isActive !== '') {
      filtered = filtered.filter(p => p.isActive === filters.isActive);
    }
    
    this.products = filtered;
  }

  clearFilters(): void {
    this.filtersForm.reset();
    this.applyFilters(); // Aplicar filtros (que mostrará todos al estar vacío)
  }

  showProductDialog = false;
  selectedProduct: Product | null = null;
  private scrollYPosition = 0;

  openProductDialog(product?: Product): void {
    // Si es un ingrediente nuevo (no edición), validar límite
    if (!product) {
      const limits = this.productService.getProductLimits();
      if (limits.hasLimits && this.products.length >= limits.maxProducts) {
        this.toastr.warning(
          `Has alcanzado el límite de ${limits.maxProducts} ingredientes de tu plan`,
          'Límite Alcanzado'
        );
        return;
      }
    }

    // Guardar la posición actual del scroll
    this.scrollYPosition = window.scrollY;
    
    // Agregar clase al body para prevenir layout shift
    document.body.classList.add('modal-open');
    document.body.style.top = `-${this.scrollYPosition}px`;
    
    this.selectedProduct = product || null;
    this.showProductDialog = true;
  }

  closeProductDialog(): void {
    // Remover clase del body al cerrar el modal
    document.body.classList.remove('modal-open');
    document.body.style.top = '';
    
    // Restaurar la posición del scroll
    window.scrollTo(0, this.scrollYPosition);
    
    this.showProductDialog = false;
    this.selectedProduct = null;
  }

  onProductDialogResult(result: boolean): void {
    this.closeProductDialog();
    if (result) {
      this.loadProducts();
    }
  }

  editProduct(product: Product): void {
    this.openProductDialog(product);
  }

  deleteProduct(product: Product): void {
    if (confirm(`¿Está seguro de eliminar el ingrediente "${product.name}"?`)) {
      // Obtener el ID de Firestore
      const productId = (product as any)._firestoreId || 
                       (typeof product.id === 'string' ? product.id : product.id.toString());
      
      this.productService.deleteIngredient(productId)
        .pipe(takeUntil(this.destroy$))
        .subscribe({
          next: () => {
            this.toastr.success('Ingrediente eliminado exitosamente');
            this.loadProducts();
          },
          error: (error) => {
            console.error('Error deleting ingredient:', error);
            this.toastr.error('Error al eliminar el ingrediente');
          }
        });
    }
  }

  // Dropdown methods for Status
  toggleStatusDropdown(): void {
    this.isStatusDropdownOpen = !this.isStatusDropdownOpen;
  }

  selectStatus(value: string | boolean): void {
    this.filtersForm.get('isActive')?.setValue(value);
    this.applyFilters();
    this.isStatusDropdownOpen = false;
  }

  getStatusDisplayValue(): string {
    const status = this.filtersForm.get('isActive')?.value;
    if (status === '') {
      return 'Todos los estados';
    } else if (status === true) {
      return 'Ingredientes Activos';
    } else if (status === false) {
      return 'Ingredientes Inactivos';
    }
    return 'Todos los estados';
  }

  // Cerrar dropdowns cuando se hace clic fuera
  @HostListener('document:click', ['$event'])
  onDocumentClick(event: Event) {
    const target = event.target as HTMLElement;
    if (!target.closest('.custom-select-field')) {
      this.isStatusDropdownOpen = false;
    }
  }

  // Método para obtener límites de ingredientes según suscripción
  getProductLimits() {
    return this.productService.getProductLimits();
  }

  // Métodos para importación desde Excel
  triggerFileInput(): void {
    this.fileInput.nativeElement.click();
  }

  onFileSelected(event: Event): void {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0];
    
    if (!file) {
      return;
    }

    // Validar extensión
    if (!file.name.match(/\.(xlsx|xls)$/)) {
      this.toastr.error('Por favor selecciona un archivo Excel (.xlsx o .xls)');
      return;
    }

    this.isImporting = true;
    const reader = new FileReader();

    reader.onload = (e: ProgressEvent<FileReader>) => {
      try {
        const data = new Uint8Array(e.target?.result as ArrayBuffer);
        const workbook = XLSX.read(data, { type: 'array' });

        // Buscar la hoja "Matriz"
        let sheetName = 'Matriz';
        if (!workbook.SheetNames.includes(sheetName)) {
          // Si no existe "Matriz", usar la primera hoja
          sheetName = workbook.SheetNames[0];
          this.toastr.warning(`No se encontró la hoja "Matriz", usando "${sheetName}"`);
        }

        const worksheet = workbook.Sheets[sheetName];
        const jsonData = XLSX.utils.sheet_to_json(worksheet, { header: 1, defval: null });

        // Procesar los datos (la fila 5 es el header, desde la 6 empiezan los datos)
        const products = this.processExcelData(jsonData);
        
        if (products.length === 0) {
          this.toastr.warning('No se encontraron productos válidos en el archivo');
          this.isImporting = false;
          return;
        }

        // Importar productos
        this.importProducts(products);
      } catch (error) {
        console.error('Error reading Excel file:', error);
        this.toastr.error('Error al leer el archivo Excel');
        this.isImporting = false;
      }
    };

    reader.onerror = () => {
      this.toastr.error('Error al leer el archivo');
      this.isImporting = false;
    };

    reader.readAsArrayBuffer(file);
    
    // Limpiar el input
    input.value = '';
  }

  private processExcelData(jsonData: any[]): Array<{ name: string; presentation?: string; unitOfMeasure: string }> {
    const products: Array<{ name: string; presentation?: string; unitOfMeasure: string }> = [];
    
    // La fila 5 (índice 4) tiene los headers: Codigo, Nombre, Presentación, Cantidad, Unidad de Medida
    // Desde la fila 6 (índice 5) empiezan los datos
    for (let i = 5; i < jsonData.length; i++) {
      const row = jsonData[i] as any[];
      
      // Verificar que tenga código y nombre (columnas 0 y 1)
      const codigo = row[0];
      const nombre = row[1];
      
      if (!codigo || !nombre) {
        // Si no hay código o nombre, asumir que terminaron los datos
        break;
      }

      const presentacion = row[2] || undefined; // Columna 2: Presentación
      const unidadMedida = row[4] || 'unidad'; // Columna 4: Unidad de Medida

      // Limpiar y validar datos
      const name = String(nombre).trim();
      const presentation = presentacion ? String(presentacion).trim() : undefined;
      const unitOfMeasure = String(unidadMedida).trim().toLowerCase() || 'unidad';

      if (name.length >= 2) {
        products.push({
          name,
          presentation: presentation && presentation.length > 0 ? presentation : undefined,
          unitOfMeasure
        });
      }
    }

    return products;
  }

  private importProducts(products: Array<{ name: string; presentation?: string; unitOfMeasure: string }>): void {
    // Importar productos secuencialmente para asegurar SKUs correlativos
    let successCount = 0;
    let errorCount = 0;
    let currentIndex = 0;

    const importNext = () => {
      if (currentIndex >= products.length) {
        // Terminó la importación
        if (successCount === products.length) {
          this.toastr.success(`Se importaron exitosamente ${successCount} ingredientes`);
        } else {
          this.toastr.warning(`Se importaron ${successCount} de ${products.length} ingredientes${errorCount > 0 ? ` (${errorCount} errores)` : ''}`);
        }
        this.isImporting = false;
        this.loadProducts(); // Recargar la lista
        return;
      }

      const product = products[currentIndex];
      const ingredientData: Omit<Product, 'id' | 'createdAt' | 'updatedAt' | 'code'> = {
        name: product.name,
        presentation: product.presentation,
        unitOfMeasure: product.unitOfMeasure,
        stock: 0,
        minStock: 0,
        maxStock: null,
        isActive: true,
        price: 0,
        cost: 0,
        taxRate: 0,
        productType: 'ingredient' as const
      };

      this.productService.createIngredient(ingredientData)
        .pipe(takeUntil(this.destroy$))
        .subscribe({
          next: () => {
            successCount++;
            currentIndex++;
            // Continuar con el siguiente producto
            importNext();
          },
          error: (error) => {
            console.error(`Error creando ingrediente ${product.name}:`, error);
            errorCount++;
            currentIndex++;
            // Continuar con el siguiente producto aunque falle este
            importNext();
          }
        });
    };

    // Iniciar la importación
    importNext();
  }

  // Métodos para exportación y plantilla
  generateTemplate(): void {
    try {
      // Crear un workbook vacío
      const wb = XLSX.utils.book_new();
      
      // Crear datos de la plantilla (solo headers)
      const templateData = [
        ['Codigo ', 'Nombre', 'Presentación ', 'Cantidad', 'Unidad de Medida '],
        // Dejar filas vacías para que el usuario las complete
      ];
      
      // Crear worksheet
      const ws = XLSX.utils.aoa_to_sheet(templateData);
      
      // Ajustar ancho de columnas
      ws['!cols'] = [
        { wch: 12 }, // Codigo
        { wch: 40 }, // Nombre
        { wch: 15 }, // Presentación
        { wch: 10 }, // Cantidad
        { wch: 20 }  // Unidad de Medida
      ];
      
      // Agregar worksheet al workbook
      XLSX.utils.book_append_sheet(wb, ws, 'Matriz');
      
      // Generar nombre de archivo con fecha
      const fileName = `Plantilla_Ingredientes_${new Date().toISOString().split('T')[0]}.xlsx`;
      
      // Descargar el archivo
      XLSX.writeFile(wb, fileName);
      
      this.toastr.success('Plantilla generada exitosamente');
    } catch (error) {
      console.error('Error generating template:', error);
      this.toastr.error('Error al generar la plantilla');
    }
  }

  getStatusColor(isActive: boolean): string {
    return isActive ? 'primary' : 'warn';
  }

  getStatusText(isActive: boolean): string {
    return isActive ? 'Activo' : 'Inactivo';
  }

  exportToExcel(): void {
    if (this.products.length === 0) {
      this.toastr.warning('No hay ingredientes para exportar');
      return;
    }

    try {
      // Crear un workbook
      const wb = XLSX.utils.book_new();
      
      // Preparar datos para exportar
      const exportData = [
        ['Codigo ', 'Nombre', 'Presentación ', 'Cantidad', 'Unidad de Medida '],
        ...this.products.map(product => [
          product.code,
          product.name,
          product.presentation || '',
          '', // Cantidad (vacío, no se usa en ingredientes)
          product.unitOfMeasure
        ])
      ];
      
      // Crear worksheet
      const ws = XLSX.utils.aoa_to_sheet(exportData);
      
      // Ajustar ancho de columnas
      ws['!cols'] = [
        { wch: 12 }, // Codigo
        { wch: 40 }, // Nombre
        { wch: 15 }, // Presentación
        { wch: 10 }, // Cantidad
        { wch: 20 }  // Unidad de Medida
      ];
      
      // Agregar worksheet al workbook
      XLSX.utils.book_append_sheet(wb, ws, 'Matriz');
      
      // Generar nombre de archivo con fecha
      const fileName = `Ingredientes_Exportados_${new Date().toISOString().split('T')[0]}.xlsx`;
      
      // Descargar el archivo
      XLSX.writeFile(wb, fileName);
      
      this.toastr.success(`Se exportaron ${this.products.length} ingredientes exitosamente`);
    } catch (error) {
      console.error('Error exporting to Excel:', error);
      this.toastr.error('Error al exportar a Excel');
    }
  }
}