/**
 * Modelo de Documento Fiscal
 */

export interface FiscalDocument {
  id: number;
  code: string;
  name: string;
  description?: string;
  prefix: string;
  initialCorrelative: number;
  currentCorrelative: number;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export interface FiscalDocumentCreate {
  name: string;
  description?: string;
  prefix: string;
  initialCorrelative: number;
  isActive: boolean;
}

export interface FiscalDocumentUpdate {
  name?: string;
  description?: string;
  prefix?: string;
  isActive?: boolean;
}

