# Crear Usuarios en Firestore

## Usuarios creados en Firebase Auth

✅ **admin@example.com** (Fernando Melgar)
- UID: `skJIaGpTLgZuB5OeRAFnwW2R9QP2`
- Contraseña: `admin123`
- Rol: `admin`

✅ **cajero1@example.com** (Maria Perez)
- UID: `eBRK7EnM4PebOzZIPWxF5FrhpiL2`
- Contraseña: `cajero123`
- Rol: `cashier`

## Crear documentos en Firestore

### Opción 1: Usar el componente temporal (Recomendado)

1. Inicia sesión como usuario SUDO (mrgomez.dev@gmail.com)
2. Navega a: `http://localhost:4200/sudo/create-users`
3. El componente creará automáticamente los documentos en Firestore

### Opción 2: Ejecutar desde la consola del navegador

1. Inicia sesión en la aplicación
2. Abre la consola del navegador (F12)
3. Ejecuta el siguiente código:

```javascript
// Obtener Firestore del injector de Angular
import { getFirestore, doc, setDoc, serverTimestamp } from '@angular/fire/firestore';
import { inject } from '@angular/core';
import { Firestore } from '@angular/fire/firestore';

// En la consola, ejecutar:
(async () => {
  const firestore = inject(Firestore);
  
  // Crear admin
  await setDoc(doc(firestore, 'accounts', 'skJIaGpTLgZuB5OeRAFnwW2R9QP2'), {
    id: 'skJIaGpTLgZuB5OeRAFnwW2R9QP2',
    email: 'admin@example.com',
    name: 'Fernando',
    lastName: 'Melgar',
    fullName: 'Fernando Melgar',
    username: 'admin',
    role: 'admin',
    status: 'active',
    isActive: true,
    companies: [],
    permissions: [],
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp()
  });
  console.log('✅ Admin creado');
  
  // Crear cajero
  await setDoc(doc(firestore, 'accounts', 'eBRK7EnM4PebOzZIPWxF5FrhpiL2'), {
    id: 'eBRK7EnM4PebOzZIPWxF5FrhpiL2',
    email: 'cajero1@example.com',
    name: 'Maria',
    lastName: 'Perez',
    fullName: 'Maria Perez',
    username: 'cajero1',
    role: 'cashier',
    status: 'active',
    isActive: true,
    companies: [],
    permissions: [],
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp()
  });
  console.log('✅ Cajero creado');
})();
```

## Verificar usuarios

Después de crear los documentos, puedes iniciar sesión con:
- **admin@example.com** / **admin123**
- **cajero1@example.com** / **cajero123**

