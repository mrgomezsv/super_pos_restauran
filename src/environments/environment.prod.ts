export const environment = {
  production: true,
  // En producción, usar variable de entorno o dominio real
  // Se puede configurar en el build: API_URL=https://api.superpos.com npm run build
  apiUrl: (typeof process !== 'undefined' && process.env?.['API_URL']) || 'https://api.superpos.com/api'
};

