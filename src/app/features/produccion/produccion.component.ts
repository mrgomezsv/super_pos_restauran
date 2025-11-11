import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, ReactiveFormsModule } from '@angular/forms';
import { Subject, takeUntil } from 'rxjs';
import { MatCardModule } from '@angular/material/card';
import { MatTableModule } from '@angular/material/table';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatDialogModule, MatDialog } from '@angular/material/dialog';
import { MatSelectModule } from '@angular/material/select';
import { MatChipsModule } from '@angular/material/chips';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatTooltipModule } from '@angular/material/tooltip';
import { ToastrService } from 'ngx-toastr';

import { RecipeService } from '../../core/services/recipe.service';
import { ProductionOrder } from '../../core/models/recipe.model';
import { TutorialGuideComponent } from '../../shared/components/tutorial-guide/tutorial-guide.component';

@Component({
    selector: 'app-produccion',
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
        MatSelectModule,
        MatChipsModule,
        MatProgressSpinnerModule,
        MatTooltipModule,
        TutorialGuideComponent
    ],
    templateUrl: './produccion.component.html',
    styleUrls: ['./produccion.component.scss']
})
export class ProduccionComponent implements OnInit, OnDestroy {
  showTutorial = false;
  productionOrders: ProductionOrder[] = [];
  displayedColumns: string[] = ['production_number', 'recipe_name', 'quantity_to_produce', 'quantity_produced', 'status', 'createdAt', 'actions'];
  isLoading = true;
  filtersForm: FormGroup;
  private destroy$ = new Subject<void>();

  constructor(
    private recipeService: RecipeService,
    private dialog: MatDialog,
    private fb: FormBuilder,
    private toastr: ToastrService
  ) {
    this.filtersForm = this.fb.group({
      search: [''],
      status: ['']
    });
  }

  ngOnInit(): void {
    this.loadProductionOrders();
    // Mostrar tutorial automáticamente si es la primera vez
    const tutorialShown = localStorage.getItem('production_tutorial_shown');
    if (!tutorialShown) {
      this.showTutorial = true;
    }
  }
  
  onTutorialCompleted(): void {
    this.showTutorial = false;
    localStorage.setItem('production_tutorial_shown', 'true');
  }
  
  showTutorialAgain(): void {
    this.showTutorial = true;
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  private loadProductionOrders(status?: string): void {
    this.isLoading = true;
    
    this.recipeService.getProductionOrders(status)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (orders) => {
          this.productionOrders = orders;
          this.isLoading = false;
        },
        error: (error) => {
          console.error('Error loading production orders:', error);
          this.toastr.error('Error al cargar las órdenes de producción');
          this.isLoading = false;
        }
      });
  }

  applyFilters(): void {
    const status = this.filtersForm.value.status || undefined;
    this.loadProductionOrders(status);
  }

  clearFilters(): void {
    this.filtersForm.reset();
    this.loadProductionOrders();
  }

  formatCurrency(amount: number): string {
    return new Intl.NumberFormat('es-SV', {
      style: 'currency',
      currency: 'USD'
    }).format(amount);
  }

  startProduction(order: ProductionOrder): void {
    if (!confirm(`¿Iniciar producción de ${order.production_number}? Se descontará el inventario de los ingredientes.`)) {
      return;
    }

    this.recipeService.startProductionOrder(order.id)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: () => {
          this.toastr.success('Producción iniciada, inventario descontado');
          this.loadProductionOrders();
        },
        error: (error) => {
          console.error('Error starting production:', error);
          this.toastr.error(error.error?.detail || 'Error al iniciar la producción');
        }
      });
  }

  completeProduction(order: ProductionOrder): void {
    const quantity = prompt(`Ingrese la cantidad producida:`);
    if (!quantity) return;

    const qty = parseFloat(quantity);
    if (isNaN(qty) || qty <= 0) {
      this.toastr.error('Cantidad inválida');
      return;
    }

    this.recipeService.completeProductionOrder(order.id, qty)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: () => {
          this.toastr.success(`${qty} unidades agregadas al inventario`);
          this.loadProductionOrders();
        },
        error: (error) => {
          console.error('Error completing production:', error);
          this.toastr.error(error.error?.detail || 'Error al completar la producción');
        }
      });
  }

  getStatusColor(status: string): string {
    switch(status) {
      case 'planned': return 'default';
      case 'in_progress': return 'primary';
      case 'completed': return 'accent';
      case 'cancelled': return 'warn';
      default: return 'default';
    }
  }

  getStatusLabel(status: string): string {
    const labels: {[key: string]: string} = {
      'planned': 'Planificada',
      'in_progress': 'En Progreso',
      'completed': 'Completada',
      'cancelled': 'Cancelada'
    };
    return labels[status] || status;
  }
}

