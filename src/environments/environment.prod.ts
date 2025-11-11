export const environment = {
  production: true,
  // En producción, actualizar esta URL con el dominio real de la API
  // Se puede reemplazar durante el build usando fileReplacements o variables de entorno del build
  // apiUrl: 'https://api.superpos.com/api'  // Comentado para usar local en desarrollo
  apiUrl: 'http://localhost:3000/api',  // Usar localhost para desarrollo
  firebase: {
    apiKey: 'AIzaSyAWlNQsUEeu-nd3kz2qxj89_nZBdxdiWO4',
    authDomain: 'waveposv2.firebaseapp.com',
    projectId: 'waveposv2',
    storageBucket: 'waveposv2.firebasestorage.app',
    messagingSenderId: '1018870127111',
    appId: '1:1018870127111:web:b81aff7043dd998b7768a2',
    measurementId: 'G-86TYFRGY6P'
  }
};

