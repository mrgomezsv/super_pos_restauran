export interface BusinessConfiguration {
  id: number;
  
  // Información de la empresa
  businessName: string;
  commercialName: string;
  taxId: string; // NIT
  registrationNumber: string; // NRC
  economicActivity: string;
  
  // Información de contacto
  address: string;
  city: string;
  state: string;
  country: string;
  zipCode: string;
  phone: string;
  email: string;
  
  // Información del establecimiento
  establishmentName: string;
  establishmentCode: string;
  
  // Configuración de tickets
  receiptHeader: string;
  receiptFooter: string;
  defaultObservations: string;
  
  // Configuración fiscal
  currency: string;
  defaultTaxRate: number;
  allowNegativeStock: boolean;
  requireCustomerInfo: boolean;
  showPricesWithTax: boolean; // Mostrar precios con IVA incluido
  
  // Configuración de impresión
  printerName?: string;
  printLogo: boolean;
  logoPath?: string;
  printQRCode: boolean;
  qrCodeUrl?: string;
  
  // Timestamps
  createdAt: Date;
  updatedAt: Date;
}

export interface BusinessConfigurationCreate {
  businessName: string;
  commercialName: string;
  taxId: string;
  registrationNumber: string;
  economicActivity: string;
  address: string;
  city: string;
  state: string;
  country: string;
  zipCode: string;
  phone: string;
  email: string;
  establishmentName: string;
  establishmentCode: string;
  receiptHeader: string;
  receiptFooter: string;
  defaultObservations: string;
  currency: string;
  defaultTaxRate: number;
  allowNegativeStock: boolean;
  requireCustomerInfo: boolean;
  showPricesWithTax: boolean; // Mostrar precios con IVA incluido
  printerName?: string;
  printLogo: boolean;
  logoPath?: string;
  printQRCode: boolean;
  qrCodeUrl?: string;
}

export interface BusinessConfigurationUpdate {
  businessName?: string;
  commercialName?: string;
  taxId?: string;
  registrationNumber?: string;
  economicActivity?: string;
  address?: string;
  city?: string;
  state?: string;
  country?: string;
  zipCode?: string;
  phone?: string;
  email?: string;
  establishmentName?: string;
  establishmentCode?: string;
  receiptHeader?: string;
  receiptFooter?: string;
  defaultObservations?: string;
  currency?: string;
  defaultTaxRate?: number;
  allowNegativeStock?: boolean;
  requireCustomerInfo?: boolean;
  showPricesWithTax?: boolean; // Mostrar precios con IVA incluido
  printerName?: string;
  printLogo?: boolean;
  logoPath?: string;
  printQRCode?: boolean;
  qrCodeUrl?: string;
}

export interface TicketTemplate {
  header: {
    businessName: string;
    commercialName: string;
    taxId: string;
    address: string;
    phone: string;
    email: string;
  };
  footer: {
    message: string;
    observations: string;
    thankYouMessage: string;
  };
  receipt: {
    title: string;
    dateLabel: string;
    generationDateLabel: string;
    generationCodeLabel: string;
    receptionSealLabel: string;
    controlNumberLabel: string;
    transmissionLabel: string;
    modelLabel: string;
    cashierLabel: string;
    invoiceNumberLabel: string;
    customerLabel: string;
    recipientLabel: string;
    duiLabel: string;
    addressLabel: string;
    subtotalLabel: string;
    taxLabel: string;
    totalLabel: string;
    paymentMethodLabel: string;
    cashReceivedLabel: string;
    cashReturnedLabel: string;
    observationsLabel: string;
  };
}
