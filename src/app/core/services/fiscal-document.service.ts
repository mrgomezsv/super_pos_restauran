import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { FiscalDocument, FiscalDocumentCreate, FiscalDocumentUpdate } from '../models/fiscal-document.model';

@Injectable({
  providedIn: 'root'
})
export class FiscalDocumentService {
  private apiUrl = 'http://localhost:3000/api';

  constructor(private http: HttpClient) {}

  getFiscalDocuments(): Observable<FiscalDocument[]> {
    return this.http.get<FiscalDocument[]>(`${this.apiUrl}/fiscal-documents`);
  }

  getFiscalDocument(id: number): Observable<FiscalDocument> {
    return this.http.get<FiscalDocument>(`${this.apiUrl}/fiscal-documents/${id}`);
  }

  createFiscalDocument(document: FiscalDocumentCreate): Observable<FiscalDocument> {
    return this.http.post<FiscalDocument>(`${this.apiUrl}/fiscal-documents`, document);
  }

  updateFiscalDocument(id: number, document: FiscalDocumentUpdate): Observable<FiscalDocument> {
    return this.http.put<FiscalDocument>(`${this.apiUrl}/fiscal-documents/${id}`, document);
  }

  deleteFiscalDocument(id: number): Observable<any> {
    return this.http.delete(`${this.apiUrl}/fiscal-documents/${id}`);
  }
}

