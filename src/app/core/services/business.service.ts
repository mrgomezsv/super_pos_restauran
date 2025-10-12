import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, BehaviorSubject, of } from 'rxjs';
import { map, tap } from 'rxjs/operators';

import { 
  BusinessConfiguration, 
  BusinessConfigurationCreate, 
  BusinessConfigurationUpdate,
  TicketTemplate 
} from '../models/business.model';

@Injectable({
  providedIn: 'root'
})
export class BusinessService {
  private readonly API_URL = 'http://localhost:3000/api/business';
  private businessConfigSubject = new BehaviorSubject<BusinessConfiguration | null>(null);
  
  public businessConfig$ = this.businessConfigSubject.asObservable();

  // Configuración por defecto (simulada)
  private defaultConfig: BusinessConfiguration = {
    id: 1,
    businessName: 'Super POS',
    commercialName: 'Super POS',
    taxId: '0000-000000-000-0',
    registrationNumber: '000000-0',
    economicActivity: 'Comercio al por menor',
    address: 'Calle Principal, Zona Centro',
    city: 'San Salvador',
    state: 'San Salvador',
    country: 'El Salvador',
    zipCode: '0000',
    phone: '0000-0000',
    email: 'info@superpos.com',
    establishmentName: 'Casa Matriz',
    establishmentCode: '001',
    receiptHeader: 'Gracias por su compra',
    receiptFooter: '¡Vuelva pronto!',
    defaultObservations: '',
    currency: 'USD',
    defaultTaxRate: 15,
    allowNegativeStock: false,
    requireCustomerInfo: false,
    printLogo: false,
    logoPath: '',
    printQRCode: false,
    qrCodeUrl: '',
    createdAt: new Date(),
    updatedAt: new Date()
  };

  constructor(private http: HttpClient) {
    // Cargar configuración al inicializar el servicio
    this.loadConfiguration();
  }

  /**
   * Obtener configuración actual del negocio
   */
  getConfiguration(): Observable<BusinessConfiguration> {
    // En desarrollo, retornar configuración simulada
    // En producción, hacer petición HTTP
    return of(this.defaultConfig).pipe(
      tap(config => this.businessConfigSubject.next(config))
    );
  }

  /**
   * Actualizar configuración del negocio
   */
  updateConfiguration(config: BusinessConfigurationUpdate): Observable<BusinessConfiguration> {
    // Simular actualización
    const updatedConfig = {
      ...this.defaultConfig,
      ...config,
      updatedAt: new Date()
    };
    
    this.defaultConfig = updatedConfig;
    this.businessConfigSubject.next(updatedConfig);
    
    return of(updatedConfig);
  }

  /**
   * Crear configuración inicial
   */
  createConfiguration(config: BusinessConfigurationCreate): Observable<BusinessConfiguration> {
    const newConfig: BusinessConfiguration = {
      ...config,
      id: 1,
      createdAt: new Date(),
      updatedAt: new Date()
    };
    
    this.defaultConfig = newConfig;
    this.businessConfigSubject.next(newConfig);
    
    return of(newConfig);
  }

  /**
   * Obtener plantilla de ticket basada en la configuración
   */
  getTicketTemplate(): Observable<TicketTemplate> {
    return this.businessConfig$.pipe(
      map(config => {
        if (!config) {
          return this.getDefaultTicketTemplate();
        }
        
        return {
          header: {
            businessName: config.businessName,
            commercialName: config.commercialName,
            taxId: config.taxId,
            address: config.address,
            phone: config.phone,
            email: config.email
          },
          footer: {
            message: config.receiptFooter,
            observations: config.defaultObservations,
            thankYouMessage: '¡Gracias por su compra!'
          },
          receipt: {
            title: 'FACTURA',
            dateLabel: 'FECHA:',
            generationDateLabel: 'FECHA GENERACIÓN:',
            generationCodeLabel: 'CÓDIGO DE GENERACIÓN:',
            receptionSealLabel: 'SELLO DE RECEPCIÓN:',
            controlNumberLabel: 'NÚMERO DE CONTROL:',
            transmissionLabel: 'TRANSMISIÓN:',
            modelLabel: 'MODELO:',
            cashierLabel: 'CAJERO:',
            invoiceNumberLabel: 'FACTURA N°:',
            customerLabel: 'CLIENTE:',
            recipientLabel: 'RECEPTOR:',
            duiLabel: 'DUI:',
            addressLabel: 'DIRECCIÓN:',
            subtotalLabel: 'SUBTOTAL:',
            taxLabel: 'IVA:',
            totalLabel: 'TOTAL:',
            paymentMethodLabel: 'MÉTODO DE PAGO:',
            cashReceivedLabel: 'EFECTIVO RECIBIDO:',
            cashReturnedLabel: 'EFECTIVO DEVUELTO:',
            observationsLabel: 'OBSERVACIONES:'
          }
        };
      })
    );
  }

  /**
   * Plantilla por defecto para tickets
   */
  private getDefaultTicketTemplate(): TicketTemplate {
    return {
      header: {
        businessName: 'Super POS',
        commercialName: 'Super POS',
        taxId: '0000-000000-000-0',
        address: 'Calle Principal, Zona Centro',
        phone: '0000-0000',
        email: 'info@superpos.com'
      },
      footer: {
        message: '¡Gracias por su compra!',
        observations: '',
        thankYouMessage: '¡Vuelva pronto!'
      },
      receipt: {
        title: 'FACTURA',
        dateLabel: 'FECHA:',
        generationDateLabel: 'FECHA GENERACIÓN:',
        generationCodeLabel: 'CÓDIGO DE GENERACIÓN:',
        receptionSealLabel: 'SELLO DE RECEPCIÓN:',
        controlNumberLabel: 'NÚMERO DE CONTROL:',
        transmissionLabel: 'TRANSMISIÓN:',
        modelLabel: 'MODELO:',
        cashierLabel: 'CAJERO:',
        invoiceNumberLabel: 'FACTURA N°:',
        customerLabel: 'CLIENTE:',
        recipientLabel: 'RECEPTOR:',
        duiLabel: 'DUI:',
        addressLabel: 'DIRECCIÓN:',
        subtotalLabel: 'SUBTOTAL:',
        taxLabel: 'IVA:',
        totalLabel: 'TOTAL:',
        paymentMethodLabel: 'MÉTODO DE PAGO:',
        cashReceivedLabel: 'EFECTIVO RECIBIDO:',
        cashReturnedLabel: 'EFECTIVO DEVUELTO:',
        observationsLabel: 'OBSERVACIONES:'
      }
    };
  }

  /**
   * Cargar configuración desde el backend
   */
  private loadConfiguration(): void {
    this.getConfiguration().subscribe();
  }

  /**
   * Validar formato de NIT salvadoreño
   */
  validateNIT(nit: string): boolean {
    // Formato: XXXX-XXXXXX-XXX-X
    const nitRegex = /^\d{4}-\d{6}-\d{3}-\d{1}$/;
    return nitRegex.test(nit);
  }

  /**
   * Validar formato de email
   */
  validateEmail(email: string): boolean {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  }

  /**
   * Validar formato de teléfono
   */
  validatePhone(phone: string): boolean {
    // Formato: XXXX-XXXX
    const phoneRegex = /^\d{4}-\d{4}$/;
    return phoneRegex.test(phone);
  }
}
