import { Component, OnInit, OnDestroy, Input, Output, EventEmitter } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, Validators, ReactiveFormsModule, FormArray } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { MatDatepickerModule } from '@angular/material/datepicker';
import { MatNativeDateModule } from '@angular/material/core';
import { MatTooltipModule } from '@angular/material/tooltip';
import { Subject, takeUntil, Observable } from 'rxjs';
import { ToastrService } from 'ngx-toastr';
import { Firestore, collection, getDocs, doc, setDoc, deleteDoc, query, orderBy, limit, serverTimestamp } from '@angular/fire/firestore';
import { from } from 'rxjs';
import { map, catchError, switchMap } from 'rxjs/operators';
import { of } from 'rxjs';

import { PurchaseOrder, PurchaseOrderItem } from '../purchase-orders.component';
import { ProductService } from '../../../core/services/product.service';
import { Product } from '../../../core/models/product.model';

@Component({
    selector: 'app-purchase-order-dialog',
    imports: [
        CommonModule,
        ReactiveFormsModule,
        MatButtonModule,
        MatIconModule,
        MatFormFieldModule,
        MatInputModule,
        MatSelectModule,
        MatDatepickerModule,
        MatNativeDateModule,
        MatTooltipModule
    ],
    templateUrl: './purchase-order-dialog.component.html',
    styleUrls: ['./purchase-order-dialog.component.scss']
})
export class PurchaseOrderDialogComponent implements OnInit, OnDestroy {
  @Input() purchaseOrder: PurchaseOrder | null = null;
  @Input() viewMode: boolean = false;
  @Output() close = new EventEmitter<boolean>();

  purchaseOrderForm!: FormGroup;
  isEdit = false;
  ingredients: Product[] = [];
  suppliers: Array<{ id: string; name: string }> = [];
  private destroy$ = new Subject<void>();

  constructor(
    private fb: FormBuilder,
    private toastr: ToastrService,
    private productService: ProductService,
    private firestore: Firestore
  ) {
    this.initializeForm();
  }

  ngOnInit(): void {
    this.isEdit = !!this.purchaseOrder;
    
    // Si está en modo vista, deshabilitar todo el formulario
    if (this.viewMode) {
      this.purchaseOrderForm.disable();
    }
    
    // Cargar ingredientes y proveedores
    this.loadIngredients();
    this.loadSuppliers();

    if (this.isEdit && this.purchaseOrder) {
      // Cargar datos de la orden existente
      this.purchaseOrderForm.patchValue({
        orderNumber: this.purchaseOrder.orderNumber,
        supplierId: this.purchaseOrder.supplierId || '',
        supplierName: this.purchaseOrder.supplierName || '',
        date: this.purchaseOrder.date instanceof Date ? this.purchaseOrder.date : new Date(this.purchaseOrder.date),
        status: this.purchaseOrder.status || 'pending'
      });
      
      // Cargar items
      const itemsArray = this.purchaseOrderForm.get('items') as FormArray;
      itemsArray.clear();
      if (this.purchaseOrder.items && this.purchaseOrder.items.length > 0) {
        this.purchaseOrder.items.forEach(item => {
          const itemGroup = this.createItemFormGroup(item);
          if (this.viewMode) {
            itemGroup.disable();
          }
          itemsArray.push(itemGroup);
        });
      } else {
        this.addItem();
      }
    } else {
      // Nueva orden - generar número automáticamente solo si no está en modo vista
      if (!this.viewMode) {
        this.generateOrderNumber();
        // Agregar un item por defecto
        this.addItem();
      }
    }
  }

  private generateOrderNumber(): void {
    this.getNextOrderNumber()
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (orderNumber) => {
          this.purchaseOrderForm.patchValue({
            orderNumber: orderNumber
          });
        },
        error: (error) => {
          console.error('Error generating order number:', error);
          // En caso de error, usar un número temporal
          this.purchaseOrderForm.patchValue({
            orderNumber: 'PO-000001'
          });
        }
      });
  }

  private loadIngredients(): void {
    this.productService.getIngredients()
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (ingredients) => {
          // Filtrar solo ingredientes activos
          this.ingredients = ingredients.filter(ing => ing.isActive);
        },
        error: (error) => {
          console.error('Error loading ingredients:', error);
          this.toastr.error('Error al cargar los ingredientes');
        }
      });
  }

  private loadSuppliers(): void {
    const suppliersRef = collection(this.firestore, 'suppliers');
    const q = query(suppliersRef, orderBy('name', 'asc'));
    
    from(getDocs(q))
      .pipe(
        map((snapshot) => {
          return snapshot.docs.map((docSnap) => {
            const data = docSnap.data();
            return {
              id: docSnap.id,
              name: data['name'] || '',
              isActive: data['isActive'] !== undefined ? data['isActive'] : true
            };
          }).filter(supplier => supplier.name && supplier.isActive); // Filtrar solo proveedores activos con nombre
        }),
        takeUntil(this.destroy$)
      )
      .subscribe({
        next: (suppliers) => {
          this.suppliers = suppliers;
        },
        error: (error) => {
          console.error('Error loading suppliers:', error);
          this.toastr.error('Error al cargar los proveedores');
        }
      });
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  private initializeForm(): void {
    this.purchaseOrderForm = this.fb.group({
      orderNumber: [{ value: '', disabled: true }], // Solo lectura, autogenerado
      supplierId: ['', [Validators.required]],
      supplierName: [''],
      date: [new Date(), [Validators.required]],
      status: ['pending', [Validators.required]],
      items: this.fb.array([])
    });
  }

  get itemsFormArray(): FormArray {
    return this.purchaseOrderForm.get('items') as FormArray;
  }

  createItemFormGroup(item?: PurchaseOrderItem): FormGroup {
    return this.fb.group({
      ingredientId: [item?.ingredientId || '', [Validators.required]],
      ingredientName: [item?.ingredientName || '', [Validators.required]],
      quantity: [item?.quantity || 0, [Validators.required, Validators.min(0.01)]],
      unitOfMeasure: [item?.unitOfMeasure || '', [Validators.required]],
      unitPrice: [item?.unitPrice || 0, [Validators.required, Validators.min(0)]],
      total: [item?.total || 0]
    });
  }

  onIngredientSelected(index: number): void {
    const itemGroup = this.itemsFormArray.at(index);
    const ingredientId = itemGroup.get('ingredientId')?.value;
    
    if (ingredientId) {
      const ingredient = this.ingredients.find(ing => {
        const ingId = (ing as any)._firestoreId || (typeof ing.id === 'string' ? ing.id : ing.id.toString());
        return ingId === ingredientId;
      });
      
      if (ingredient) {
        // Auto-completar nombre y unidad de medida
        itemGroup.patchValue({
          ingredientName: ingredient.name,
          unitOfMeasure: ingredient.unitOfMeasure
        }, { emitEvent: false });
      }
    }
  }

  onSupplierSelected(): void {
    const supplierId = this.purchaseOrderForm.get('supplierId')?.value;
    
    if (supplierId) {
      const supplier = this.suppliers.find(s => s.id === supplierId);
      if (supplier) {
        this.purchaseOrderForm.patchValue({
          supplierName: supplier.name
        }, { emitEvent: false });
      }
    }
  }

  getIngredientDisplay(ingredient: Product): string {
    return `${ingredient.code} - ${ingredient.name}`;
  }

  getIngredientId(ingredient: Product): string {
    return (ingredient as any)._firestoreId || (typeof ingredient.id === 'string' ? ingredient.id : ingredient.id.toString());
  }

  addItem(): void {
    const itemsArray = this.itemsFormArray;
    const itemGroup = this.createItemFormGroup();
    if (this.viewMode) {
      itemGroup.disable();
    }
    itemsArray.push(itemGroup);
  }

  removeItem(index: number): void {
    const itemsArray = this.itemsFormArray;
    if (itemsArray.length > 1) {
      itemsArray.removeAt(index);
      this.calculateTotal();
    } else {
      this.toastr.warning('Debe tener al menos un item en la orden');
    }
  }

  calculateItemTotal(index: number): void {
    const item = this.itemsFormArray.at(index);
    const quantity = item.get('quantity')?.value || 0;
    const unitPrice = item.get('unitPrice')?.value || 0;
    const total = quantity * unitPrice;
    item.patchValue({ total }, { emitEvent: false });
    this.calculateTotal();
  }

  calculateTotal(): void {
    const items = this.itemsFormArray.value;
    const total = items.reduce((sum: number, item: PurchaseOrderItem) => {
      return sum + (item.total || 0);
    }, 0);
    // El total se puede mostrar en el template, no lo guardamos en el form
  }

  getTotal(): number {
    const items = this.itemsFormArray.value;
    return items.reduce((sum: number, item: PurchaseOrderItem) => {
      return sum + (item.total || 0);
    }, 0);
  }

  private getNextOrderNumber(): Observable<string> {
    const ordersRef = collection(this.firestore, 'purchase-orders');
    const q = query(ordersRef, orderBy('orderNumber', 'desc'), limit(1));
    
    return from(getDocs(q)).pipe(
      map((snapshot) => {
        if (snapshot.empty) {
          return 'PO-000001';
        }
        const lastDoc = snapshot.docs[0];
        const lastOrderNumber = lastDoc.data()['orderNumber'] || 'PO-000000';
        const lastNumber = parseInt(lastOrderNumber.replace('PO-', ''), 10) || 0;
        const nextNumber = lastNumber + 1;
        const nextOrderNumber = `PO-${nextNumber.toString().padStart(6, '0')}`;
        return nextOrderNumber;
      }),
      catchError((error) => {
        console.error('Error getting next order number:', error);
        return of('PO-000001');
      })
    );
  }

  onSave(): void {
    if (this.purchaseOrderForm.valid) {
      const formData = this.purchaseOrderForm.getRawValue();
      
      // Obtener el nombre del proveedor desde la lista
      const supplierId = formData.supplierId;
      const supplier = this.suppliers.find(s => s.id === supplierId);
      const supplierName = supplier?.name || formData.supplierName || '';
      
      const saveOrder = (orderNumber: string) => {
        const orderData: any = {
          orderNumber: orderNumber,
          supplierId: supplierId,
          supplierName: supplierName,
          date: formData.date instanceof Date ? formData.date : new Date(formData.date),
          status: formData.status || 'pending',
          total: this.getTotal(),
          items: this.itemsFormArray.value.map((item: any) => ({
            ingredientId: item.ingredientId,
            ingredientName: item.ingredientName,
            quantity: item.quantity,
            unitOfMeasure: item.unitOfMeasure,
            unitPrice: item.unitPrice,
            total: item.total
          })),
          updatedAt: serverTimestamp()
        };

        if (this.isEdit && this.purchaseOrder) {
          // Actualizar orden existente
          const orderRef = doc(this.firestore, 'purchase-orders', this.purchaseOrder.id);
          from(setDoc(orderRef, orderData, { merge: true }))
            .pipe(
              catchError((error) => {
                console.error('Error updating purchase order:', error);
                this.toastr.error('Error al actualizar la orden de compra');
                return of(null);
              })
            )
            .subscribe({
              next: () => {
                this.toastr.success('Orden de compra actualizada exitosamente');
                this.close.emit(true);
              }
            });
        } else {
          // Crear nueva orden
          const ordersRef = collection(this.firestore, 'purchase-orders');
          const newOrderRef = doc(ordersRef);
          
          // Inicializar historial de estados con el estado inicial
          const initialStatusHistory = [{
            status: orderData.status || 'pending',
            changedAt: new Date(),
            changedBy: 'system',
            notes: 'Orden creada'
          }];
          
          const newOrderData = {
            ...orderData,
            id: newOrderRef.id,
            statusHistory: initialStatusHistory,
            createdAt: serverTimestamp()
          };
          
          from(setDoc(newOrderRef, newOrderData))
            .pipe(
              catchError((error) => {
                console.error('Error creating purchase order:', error);
                this.toastr.error('Error al crear la orden de compra');
                return of(null);
              })
            )
            .subscribe({
              next: () => {
                this.toastr.success('Orden de compra creada exitosamente');
                this.close.emit(true);
              }
            });
        }
      };

      // El número de orden siempre está disponible (se genera automáticamente o viene de la orden existente)
      // getRawValue() incluye campos deshabilitados
      const orderNumber = this.purchaseOrderForm.getRawValue().orderNumber || this.purchaseOrder?.orderNumber || '';
      saveOrder(orderNumber);
    } else {
      this.markFormGroupTouched();
      this.toastr.warning('Por favor, completa todos los campos requeridos');
    }
  }

  onCancel(): void {
    this.close.emit(false);
  }

  private markFormGroupTouched(): void {
    Object.keys(this.purchaseOrderForm.controls).forEach(key => {
      const control = this.purchaseOrderForm.get(key);
      control?.markAsTouched();
    });
  }

  getErrorMessage(controlName: string): string {
    const control = this.purchaseOrderForm.get(controlName);
    if (control?.hasError('required')) {
      return 'Este campo es requerido';
    }
    if (control?.hasError('min')) {
      return `El valor mínimo es ${control.errors?.['min'].min}`;
    }
    return '';
  }
}

