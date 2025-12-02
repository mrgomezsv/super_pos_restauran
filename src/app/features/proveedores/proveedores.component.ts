import { Component, OnDestroy, OnInit, HostListener } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { MatCardModule } from '@angular/material/card';
import { MatButtonModule } from '@angular/material/button';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatTableModule } from '@angular/material/table';
import { MatIconModule } from '@angular/material/icon';
import { MatMenuModule } from '@angular/material/menu';
import { MatTooltipModule } from '@angular/material/tooltip';
import { ToastrService } from 'ngx-toastr';
import { Firestore, collection, doc, getDocs, getDoc, setDoc, deleteDoc, query, orderBy, serverTimestamp } from '@angular/fire/firestore';
import { from, Observable, of, Subject } from 'rxjs';
import { map, catchError, debounceTime, distinctUntilChanged, takeUntil } from 'rxjs/operators';

export interface Supplier {
  id: string;
  name: string;
  nit?: string | null;
  nrc?: string | null;
  email?: string | null;
  email2?: string | null;
  email3?: string | null;
  phone?: string | null;
  phone2?: string | null;
  phone3?: string | null;
  address?: string | null;
  contact_person?: string | null;
  business_activity?: string | null;
  isActive: boolean;
  createdAt?: Date;
  updatedAt?: Date;
}

@Component({
  selector: 'app-proveedores',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    MatCardModule,
    MatButtonModule,
    MatFormFieldModule,
    MatInputModule,
    MatTableModule,
    MatIconModule,
    MatMenuModule,
    MatTooltipModule
  ],
  templateUrl: './proveedores.component.html',
  styleUrls: ['./proveedores.component.scss']
})
export class ProveedoresComponent implements OnInit, OnDestroy {
  cols = ['name', 'nit', 'nrc', 'contact_person', 'phone', 'actions'];
  suppliers: Supplier[] = [];
  allSuppliers: Supplier[] = []; // Lista completa para filtrar
  form: FormGroup;
  filtersForm: FormGroup;
  loading = false;
  showDialog = false;
  editingSupplier: Supplier | null = null;
  isStatusDropdownOpen = false;
  private readonly SUPPLIERS_COLLECTION = 'suppliers';
  private destroy$ = new Subject<void>();

  constructor(
    private fb: FormBuilder,
    private toastr: ToastrService,
    private firestore: Firestore
  ) {
    this.form = this.fb.group({
      name: ['', [Validators.required, Validators.minLength(2)]],
      nit: [''],
      nrc: [''],
      email: [''],
      email2: [''],
      email3: [''],
      phone: [''],
      phone2: [''],
      phone3: [''],
      address: [''],
      contact_person: [''],
      business_activity: ['']
    });

    ['email', 'email2', 'email3'].forEach(field => {
      const control = this.form.get(field);
      control?.valueChanges.subscribe(value => {
        if (value && value.trim()) {
          control.setValidators([Validators.email]);
        } else {
          control?.clearValidators();
        }
        control?.updateValueAndValidity({ emitEvent: false });
      });
    });

    // Formulario de filtros
    this.filtersForm = this.fb.group({
      search: [''],
      isActive: ['']
    });
  }

  ngOnInit(): void {
    this.load();
    // Crear proveedor de ejemplo si no existe ninguno
    this.createExampleSupplier();
    
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

  private async createExampleSupplier(): Promise<void> {
    try {
      const suppliersRef = collection(this.firestore, this.SUPPLIERS_COLLECTION);
      const snapshot = await getDocs(suppliersRef);
      
      // Solo crear si no hay proveedores
      if (snapshot.empty) {
        const exampleSupplierRef = doc(suppliersRef);
        const exampleSupplier = {
          name: 'Distribuidora Central S.A. de C.V.',
          nit: '0614-123456-101-1',
          nrc: '12345-6',
          email: 'ventas@distribuidoracentral.com',
          email2: 'compras@distribuidoracentral.com',
          email3: null,
          phone: '22345678',
          phone2: '22345679',
          phone3: null,
          address: 'Calle Principal 123, Colonia Centro, San Salvador',
          contact_person: 'Carlos Ramírez - Gerente de Ventas',
          business_activity: 'Distribución al por mayor de productos alimenticios y bebidas',
          isActive: true,
          createdAt: serverTimestamp(),
          updatedAt: serverTimestamp()
        };
        
        await setDoc(exampleSupplierRef, exampleSupplier);
        console.log('✅ Proveedor de ejemplo creado exitosamente');
        // Recargar la lista
        this.load();
      }
    } catch (error) {
      console.error('Error creando proveedor de ejemplo:', error);
    }
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  @HostListener('document:click', ['$event'])
  onDocumentClick(event: Event) {
    const target = event.target as HTMLElement;
    if (!target.closest('.custom-select-field')) {
      this.isStatusDropdownOpen = false;
    }
  }

  load(): void {
    this.loading = true;
    const suppliersRef = collection(this.firestore, this.SUPPLIERS_COLLECTION);
    const q = query(suppliersRef, orderBy('name', 'asc'));
    
    from(getDocs(q)).pipe(
      map((snapshot) => {
        return snapshot.docs.map((docSnap) => {
          const data = docSnap.data();
          return {
            id: docSnap.id,
            name: data['name'] || '',
            nit: data['nit'] || null,
            nrc: data['nrc'] || null,
            email: data['email'] || null,
            email2: data['email2'] || null,
            email3: data['email3'] || null,
            phone: data['phone'] || null,
            phone2: data['phone2'] || null,
            phone3: data['phone3'] || null,
            address: data['address'] || null,
            contact_person: data['contact_person'] || null,
            business_activity: data['business_activity'] || null,
            isActive: data['isActive'] !== undefined ? data['isActive'] : true,
            createdAt: data['createdAt']?.toDate() || new Date(),
            updatedAt: data['updatedAt']?.toDate() || new Date()
          } as Supplier;
        });
      }),
      catchError((error) => {
        console.error('Error cargando proveedores:', error);
        this.toastr.error('Error al cargar proveedores');
        return of([]);
      })
    ).subscribe({
      next: (suppliers) => {
        this.allSuppliers = suppliers;
        this.applyFilters(); // Aplicar filtros después de cargar
        this.loading = false;
      }
    });
  }

  applyFilters(): void {
    const filters = this.filtersForm.value;
    
    // Aplicar filtros sobre la lista completa
    let filtered = [...this.allSuppliers];
    
    if (filters.search) {
      const searchLower = filters.search.toLowerCase();
      filtered = filtered.filter(s => 
        s.name.toLowerCase().includes(searchLower) ||
        (s.nit && s.nit.toLowerCase().includes(searchLower)) ||
        (s.contact_person && s.contact_person.toLowerCase().includes(searchLower)) ||
        (s.phone && s.phone.toLowerCase().includes(searchLower))
      );
    }
    
    if (filters.isActive !== undefined && filters.isActive !== null && filters.isActive !== '') {
      filtered = filtered.filter(s => s.isActive === filters.isActive);
    }
    
    this.suppliers = filtered;
  }

  clearFilters(): void {
    this.filtersForm.reset();
    this.applyFilters(); // Aplicar filtros (que mostrará todos al estar vacío)
  }

  toggleStatusDropdown(): void {
    this.isStatusDropdownOpen = !this.isStatusDropdownOpen;
  }

  selectStatus(value: string | boolean): void {
    this.filtersForm.get('isActive')?.setValue(value);
    this.isStatusDropdownOpen = false;
  }

  getStatusDisplayValue(): string {
    const status = this.filtersForm.get('isActive')?.value;
    if (status === '') {
      return 'Todos los estados';
    } else if (status === true) {
      return 'Proveedores Activos';
    } else if (status === false) {
      return 'Proveedores Inactivos';
    }
    return 'Todos los estados';
  }

  openDialog(supplier?: Supplier): void {
    this.editingSupplier = supplier || null;
    if (supplier) {
      this.form.patchValue({
        name: supplier.name || '',
        nit: supplier.nit || '',
        nrc: supplier.nrc || '',
        email: supplier.email || '',
        email2: supplier.email2 || '',
        email3: supplier.email3 || '',
        phone: supplier.phone || '',
        phone2: supplier.phone2 || '',
        phone3: supplier.phone3 || '',
        address: supplier.address || '',
        contact_person: supplier.contact_person || '',
        business_activity: supplier.business_activity || ''
      });
    } else {
      this.form.reset();
      this.form.markAsUntouched();
    }
    this.showDialog = true;
  }

  closeDialog(): void {
    this.showDialog = false;
    this.editingSupplier = null;
    this.form.reset();
    this.form.markAsUntouched();
  }

  create(): void {
    if (this.form.invalid) {
      Object.keys(this.form.controls).forEach(key => {
        this.form.get(key)?.markAsTouched();
      });
      this.toastr.warning('Por favor completa todos los campos requeridos');
      return;
    }

    this.loading = true;
    const supplierData = {
      name: this.form.value.name?.trim() || '',
      nit: this.form.value.nit?.trim() || null,
      nrc: this.form.value.nrc?.trim() || null,
      email: this.form.value.email?.trim() || null,
      email2: this.form.value.email2?.trim() || null,
      email3: this.form.value.email3?.trim() || null,
      phone: this.form.value.phone?.trim() || null,
      phone2: this.form.value.phone2?.trim() || null,
      phone3: this.form.value.phone3?.trim() || null,
      address: this.form.value.address?.trim() || null,
      contact_person: this.form.value.contact_person?.trim() || null,
      business_activity: this.form.value.business_activity?.trim() || null,
      isActive: true,
      updatedAt: serverTimestamp()
    };

    if (this.editingSupplier) {
      // Actualizar proveedor existente
      const supplierRef = doc(this.firestore, this.SUPPLIERS_COLLECTION, this.editingSupplier.id);
      from(setDoc(supplierRef, supplierData, { merge: true })).pipe(
        catchError((error) => {
          console.error('Error actualizando proveedor:', error);
          this.toastr.error('Error al actualizar proveedor');
          this.loading = false;
          return of(null);
        })
      ).subscribe({
        next: () => {
          this.toastr.success('Proveedor actualizado exitosamente');
          this.closeDialog();
          this.load();
        }
      });
    } else {
      // Crear nuevo proveedor
      const suppliersRef = collection(this.firestore, this.SUPPLIERS_COLLECTION);
      const newDocRef = doc(suppliersRef);
      const newSupplierData = {
        ...supplierData,
        createdAt: serverTimestamp()
      };
      
      from(setDoc(newDocRef, newSupplierData)).pipe(
        catchError((error) => {
          console.error('Error creando proveedor:', error);
          this.toastr.error('Error al agregar proveedor');
          this.loading = false;
          return of(null);
        })
      ).subscribe({
      next: () => {
          this.toastr.success('Proveedor agregado exitosamente');
        this.closeDialog();
        this.load();
      }
    });
    }
  }

  editSupplier(supplier: Supplier): void {
    this.openDialog(supplier);
  }

  deleteSupplier(supplier: Supplier): void {
    if (!confirm(`¿Estás seguro de eliminar al proveedor "${supplier.name}"?`)) {
      return;
    }

    this.loading = true;
    const supplierRef = doc(this.firestore, this.SUPPLIERS_COLLECTION, supplier.id);
    from(deleteDoc(supplierRef)).pipe(
      catchError((error) => {
        console.error('Error eliminando proveedor:', error);
        this.toastr.error('Error al eliminar proveedor');
        this.loading = false;
        return of(null);
      })
    ).subscribe({
      next: () => {
        this.toastr.success('Proveedor eliminado exitosamente');
        this.load();
      }
    });
  }
}

