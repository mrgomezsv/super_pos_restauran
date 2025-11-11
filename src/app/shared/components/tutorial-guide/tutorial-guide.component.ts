import { Component, OnInit, OnDestroy, Input, Output, EventEmitter } from '@angular/core';
import { CommonModule } from '@angular/common';
import { trigger, state, style, transition, animate } from '@angular/animations';
import { Subject, takeUntil } from 'rxjs';
import { MatCardModule } from '@angular/material/card';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatTooltipModule } from '@angular/material/tooltip';
import { MatProgressBarModule } from '@angular/material/progress-bar';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';

export interface TutorialStep {
  id: string;
  title: string;
  description: string;
  route: string;
  action?: string;
  highlightSelector?: string;
}

@Component({
    selector: 'app-tutorial-guide',
    imports: [
        CommonModule,
        MatCardModule,
        MatButtonModule,
        MatIconModule,
        MatTooltipModule,
        MatProgressBarModule,
        MatProgressSpinnerModule
    ],
    templateUrl: './tutorial-guide.component.html',
    styleUrls: ['./tutorial-guide.component.scss'],
    animations: [
        trigger('flashAnimation', [
            transition('* => *', [
                style({ transform: 'scale(1)', opacity: 1 }),
                animate('300ms ease-out')
            ])
        ])
    ]
})
export class TutorialGuideComponent implements OnInit, OnDestroy {
  @Input() tutorialId: string = 'default';
  @Output() stepCompleted = new EventEmitter<number>();
  @Output() tutorialCompleted = new EventEmitter<void>();

  currentStep = 0;
  steps: TutorialStep[] = [];
  private destroy$ = new Subject<void>();
  
  constructor() {}

  ngOnInit(): void {
    // Los @Input están disponibles aquí
    this.initializeTutorial();
    // Auto-avanzar cada 8 segundos si no hay interacción
    // setInterval(() => {
    //   if (this.currentStep < this.steps.length - 1) {
    //     this.nextStep();
    //   }
    // }, 8000);
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  initializeTutorial(): void {
    // Tutorial de producción
    if (this.tutorialId === 'production') {
      this.steps = [
        {
          id: 'step-1',
          title: '📦 Ingredientes Creados',
          description: 'Ya tienes 5 materias primas en inventario: Harina (100kg), Pollo Entero (50 unid), Aceite (30L), Sal (200kg), Cebolla (100kg)',
          route: '/products',
          action: 'Revisar inventario en Gestión de Ingredientes'
        },
        {
          id: 'step-2',
          title: '🍽️ Producto Final Creado',
          description: 'El platillo "Pollo al Horno" ya existe como producto. Actualmente tiene 0 stock porque aún no se ha producido.',
          route: '/products',
          action: 'Ver producto "Pollo al Horno"'
        },
        {
          id: 'step-3',
          title: '📝 Receta Lista',
          description: 'La receta "Receta Pollo al Horno" ya está configurada con sus 5 ingredientes. Costo: $5.44 por platillo.',
          route: '/recetas',
          action: 'Ver la receta completa'
        },
        {
          id: 'step-4',
          title: '🔧 Orden de Producción',
          description: 'La orden PROD-001 está planificada para producir 10 unidades. Haz clic en el botón de "Iniciar" ⏯️',
          route: '/produccion',
          action: 'Iniciar la producción'
        },
        {
          id: 'step-5',
          title: '✅ Completar Producción',
          description: 'Después de iniciar, haz clic en el botón "✓" para completar. Ingresa 10 unidades producidas.',
          route: '/produccion',
          action: 'Completar la producción'
        },
        {
          id: 'step-6',
          title: '🛒 Vender en POS',
          description: 'Ahora "Pollo al Horno" tiene 10 unidades en stock. Ve al POS y factura este platillo.',
          route: '/pos',
          action: 'Abrir Punto de Venta'
        }
      ];
    }
  }

  get currentStepData(): TutorialStep {
    return this.steps[this.currentStep];
  }

  get progress(): number {
    return ((this.currentStep + 1) / this.steps.length) * 100;
  }

  nextStep(): void {
    if (this.currentStep < this.steps.length - 1) {
      this.currentStep++;
      this.stepCompleted.emit(this.currentStep);
    } else {
      this.completeTutorial();
    }
  }

  previousStep(): void {
    if (this.currentStep > 0) {
      this.currentStep--;
    }
  }

  jumpToStep(index: number): void {
    if (index >= 0 && index < this.steps.length) {
      this.currentStep = index;
      this.stepCompleted.emit(this.currentStep);
    }
  }

  completeTutorial(): void {
    this.tutorialCompleted.emit();
  }

  navigateToRoute(): void {
    // This will be handled by parent component or router
  }
}

