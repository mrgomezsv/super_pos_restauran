import { Component, OnInit, OnDestroy, HostListener } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Subject, takeUntil } from 'rxjs';
import { MatCardModule } from '@angular/material/card';
import { MatTableModule } from '@angular/material/table';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatTooltipModule } from '@angular/material/tooltip';
import { ToastrService } from 'ngx-toastr';

import { FiscalDocumentService } from '../../core/services/fiscal-document.service';
import { FiscalDocument } from '../../core/models/fiscal-document.model';
import { FiscalDocumentDialogComponent } from './fiscal-document-dialog/fiscal-document-dialog.component';

@Component({
  selector: 'app-fiscal-documents',
  standalone: true,
  imports: [
    CommonModule,
    MatCardModule,
    MatTableModule,
    MatButtonModule,
    MatIconModule,
    MatProgressSpinnerModule,
    MatTooltipModule,
    FiscalDocumentDialogComponent
  ],
  templateUrl: './fiscal-documents.component.html',
  styleUrls: ['./fiscal-documents.component.scss']
})
export class FiscalDocumentsComponent implements OnInit, OnDestroy {
  documents: FiscalDocument[] = [];
  displayedColumns: string[] = ['name', 'prefix', 'correlatives', 'status', 'actions'];
  isLoading = true;
  private destroy$ = new Subject<void>();
  
  showDocumentDialog = false;
  selectedDocument: FiscalDocument | null = null;
  private scrollYPosition = 0;

  constructor(
    private fiscalDocumentService: FiscalDocumentService,
    private toastr: ToastrService
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
    
    this.fiscalDocumentService.getFiscalDocuments()
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (documents) => {
          this.documents = documents;
          this.isLoading = false;
        },
        error: (error) => {
          console.error('Error loading fiscal documents:', error);
          this.toastr.error('Error al cargar los documentos fiscales');
          this.isLoading = false;
        }
      });
  }

  openDocumentDialog(fiscalDocument?: FiscalDocument): void {
    this.scrollYPosition = window.scrollY;
    document.body.classList.add('modal-open');
    document.body.style.top = `-${this.scrollYPosition}px`;
    
    this.selectedDocument = fiscalDocument || null;
    this.showDocumentDialog = true;
  }

  closeDocumentDialog(): void {
    document.body.classList.remove('modal-open');
    document.body.style.top = '';
    window.scrollTo(0, this.scrollYPosition);
    
    this.showDocumentDialog = false;
    this.selectedDocument = null;
  }

  onDocumentDialogResult(result: boolean): void {
    this.closeDocumentDialog();
    if (result) {
      this.loadDocuments();
    }
  }

  editDocument(fiscalDocument: FiscalDocument): void {
    this.openDocumentDialog(fiscalDocument);
  }

  deleteDocument(fiscalDocument: FiscalDocument): void {
    if (confirm(`¿Está seguro de eliminar el documento "${fiscalDocument.name}"?`)) {
      this.fiscalDocumentService.deleteFiscalDocument(fiscalDocument.id)
        .pipe(takeUntil(this.destroy$))
        .subscribe({
          next: () => {
            this.toastr.success('Documento fiscal eliminado exitosamente');
            this.loadDocuments();
          },
          error: (error) => {
            console.error('Error deleting fiscal document:', error);
            this.toastr.error('Error al eliminar el documento fiscal');
          }
        });
    }
  }
}

