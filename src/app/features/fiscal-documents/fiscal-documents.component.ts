import { Component, OnInit, OnDestroy, HostListener } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Subject, takeUntil } from 'rxjs';
import { MatCardModule } from '@angular/material/card';
import { MatTableModule } from '@angular/material/table';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatTooltipModule } from '@angular/material/tooltip';
import { MatDialogModule, MatDialog, MAT_DIALOG_DATA } from '@angular/material/dialog';
import { ToastrService } from 'ngx-toastr';
import { HttpClient } from '@angular/common/http';
import { environment } from '../../../environments/environment';
import { FiscalDocumentDialogComponent } from './fiscal-document-dialog/fiscal-document-dialog.component';

interface FiscalDocument {
  id: number;
  company_id: number;
  code: string;
  name: string;
  description?: string;
  prefix: string;
  initialCorrelative: number;
  currentCorrelative: number;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

@Component({
    selector: 'app-fiscal-documents',
    imports: [
        CommonModule,
        MatCardModule,
        MatTableModule,
        MatButtonModule,
        MatIconModule,
        MatProgressSpinnerModule,
        MatTooltipModule,
        MatDialogModule
    ],
    templateUrl: './fiscal-documents.component.html',
    styleUrls: ['./fiscal-documents.component.scss']
})
export class FiscalDocumentsComponent implements OnInit, OnDestroy {
  documents: FiscalDocument[] = [];
  displayedColumns: string[] = ['name', 'prefix', 'correlatives', 'status', 'actions'];
  isLoading = true;
  private destroy$ = new Subject<void>();
  private scrollYPosition = 0;

  private readonly api = `${environment.apiUrl}/fiscal-documents`;

  constructor(
    private http: HttpClient,
    private toastr: ToastrService,
    private dialog: MatDialog
  ) {}

  ngOnInit(): void {
    this.loadDocuments();
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  private loadDocuments(): void {
    this.isLoading = true;
    
    this.http.get<FiscalDocument[]>(this.api).subscribe({
      next: (data) => {
        this.documents = data;
        this.isLoading = false;
      },
      error: (err) => {
        console.error('Error cargando documentos fiscales:', err);
        this.toastr.error('Error al cargar documentos fiscales');
        this.isLoading = false;
      }
    });
  }

  openDocumentDialog(fiscalDocument?: FiscalDocument): void {
    const scrollY = window.scrollY;
    document.body.classList.add('modal-open');
    document.body.style.top = `-${scrollY}px`;
    
    const dialogRef = this.dialog.open(FiscalDocumentDialogComponent, {
      width: '700px',
      maxWidth: '90vw',
      maxHeight: '90vh',
      panelClass: 'custom-dialog-container',
      hasBackdrop: true,
      disableClose: false,
      autoFocus: true,
      data: fiscalDocument || null
    });

    dialogRef.afterClosed().subscribe(result => {
      document.body.classList.remove('modal-open');
      document.body.style.top = '';
      window.scrollTo(0, scrollY);
      
      if (result) {
        this.loadDocuments();
      }
    });
  }

  editDocument(fiscalDocument: FiscalDocument): void {
    this.openDocumentDialog(fiscalDocument);
  }

  deleteDocument(fiscalDocument: FiscalDocument): void {
    if (confirm(`¿Está seguro de eliminar el documento "${fiscalDocument.name}"?`)) {
      this.http.delete(`${this.api}/${fiscalDocument.id}`)
        .pipe(takeUntil(this.destroy$))
        .subscribe({
          next: () => {
            this.toastr.success('Documento fiscal eliminado exitosamente');
            this.loadDocuments();
          },
          error: (error: any) => {
            console.error('Error deleting fiscal document:', error);
            this.toastr.error('Error al eliminar el documento fiscal');
          }
        });
    }
  }
}

