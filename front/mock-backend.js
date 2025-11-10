// Mock Backend para el Sistema POS
// Este archivo simula un backend Express.js para desarrollo

const express = require('express');
const cors = require('cors');
const app = express();
const PORT = 3000;

// Middleware
app.use(cors());
app.use(express.json());

// Datos simulados
let users = [
  {
    id: 1,
    username: 'admin',
    name: 'Administrador',
    email: 'admin@superpos.com',
    password: 'admin123', // En producción usar hash
    role: 'admin',
    isActive: true,
    createdAt: new Date(),
    lastLogin: null
  },
  {
    id: 2,
    username: 'cajero1',
    name: 'Juan Pérez',
    email: 'juan@superpos.com',
    password: 'cajero123',
    role: 'cashier',
    isActive: true,
    createdAt: new Date(),
    lastLogin: null
  }
];

let products = [
  {
    id: 1,
    code: 'PROD001',
    name: 'Coca Cola 350ml',
    description: 'Bebida gaseosa Coca Cola 350ml',
    price: 1.25,
    cost: 0.80,
    category: 'Bebidas',
    brand: 'Coca Cola',
    stock: 100,
    minStock: 10,
    maxStock: 200,
    barcode: '1234567890123',
    taxRate: 15,
    isActive: true,
    createdAt: new Date(),
    updatedAt: new Date()
  },
  {
    id: 2,
    code: 'PROD002',
    name: 'Pan Integral',
    description: 'Pan integral 500g',
    price: 2.50,
    cost: 1.80,
    category: 'Panadería',
    brand: 'Panadería El Sol',
    stock: 50,
    minStock: 5,
    maxStock: 100,
    barcode: '2345678901234',
    taxRate: 15,
    isActive: true,
    createdAt: new Date(),
    updatedAt: new Date()
  },
  {
    id: 3,
    code: 'PROD003',
    name: 'Leche Entera 1L',
    description: 'Leche entera pasteurizada 1 litro',
    price: 3.20,
    cost: 2.50,
    category: 'Lácteos',
    brand: 'Lácteos del Valle',
    stock: 75,
    minStock: 15,
    maxStock: 150,
    barcode: '3456789012345',
    taxRate: 15,
    isActive: true,
    createdAt: new Date(),
    updatedAt: new Date()
  }
];

let sales = [];
let nextSaleId = 1;

// Rutas de autenticación
app.post('/api/auth/login', (req, res) => {
  const { username, password } = req.body;
  
  const user = users.find(u => u.username === username && u.password === password && u.isActive);
  
  if (user) {
    // Actualizar último login
    user.lastLogin = new Date();
    
    // En producción, generar JWT real
    const token = `mock_token_${user.id}_${Date.now()}`;
    
    res.json({
      token,
      user: {
        id: user.id,
        username: user.username,
        name: user.name,
        email: user.email,
        role: user.role,
        isActive: user.isActive,
        createdAt: user.createdAt,
        lastLogin: user.lastLogin
      },
      expiresIn: 3600
    });
  } else {
    res.status(401).json({ message: 'Credenciales inválidas' });
  }
});

// Rutas de productos
app.get('/api/products', (req, res) => {
  let filteredProducts = [...products];
  
  if (req.query.search) {
    const search = req.query.search.toLowerCase();
    filteredProducts = filteredProducts.filter(p => 
      p.code.toLowerCase().includes(search) ||
      p.name.toLowerCase().includes(search) ||
      p.description?.toLowerCase().includes(search)
    );
  }
  
  if (req.query.category) {
    filteredProducts = filteredProducts.filter(p => p.category === req.query.category);
  }
  
  if (req.query.brand) {
    filteredProducts = filteredProducts.filter(p => p.brand === req.query.brand);
  }
  
  if (req.query.isActive !== undefined) {
    const isActive = req.query.isActive === 'true';
    filteredProducts = filteredProducts.filter(p => p.isActive === isActive);
  }
  
  res.json(filteredProducts);
});

app.get('/api/products/:id', (req, res) => {
  const product = products.find(p => p.id === parseInt(req.params.id));
  if (product) {
    res.json(product);
  } else {
    res.status(404).json({ message: 'Producto no encontrado' });
  }
});

app.get('/api/products/code/:code', (req, res) => {
  const product = products.find(p => p.code === req.params.code);
  if (product) {
    res.json(product);
  } else {
    res.status(404).json({ message: 'Producto no encontrado' });
  }
});

app.get('/api/products/barcode/:barcode', (req, res) => {
  const product = products.find(p => p.barcode === req.params.barcode);
  if (product) {
    res.json(product);
  } else {
    res.status(404).json({ message: 'Producto no encontrado' });
  }
});

app.post('/api/products', (req, res) => {
  const newProduct = {
    id: products.length + 1,
    ...req.body,
    createdAt: new Date(),
    updatedAt: new Date()
  };
  products.push(newProduct);
  res.status(201).json(newProduct);
});

app.put('/api/products/:id', (req, res) => {
  const index = products.findIndex(p => p.id === parseInt(req.params.id));
  if (index !== -1) {
    products[index] = { ...products[index], ...req.body, updatedAt: new Date() };
    res.json(products[index]);
  } else {
    res.status(404).json({ message: 'Producto no encontrado' });
  }
});

app.delete('/api/products/:id', (req, res) => {
  const index = products.findIndex(p => p.id === parseInt(req.params.id));
  if (index !== -1) {
    products.splice(index, 1);
    res.status(204).send();
  } else {
    res.status(404).json({ message: 'Producto no encontrado' });
  }
});

app.get('/api/products/categories', (req, res) => {
  const categories = [
    { id: 1, name: 'Bebidas', description: 'Bebidas y refrescos', isActive: true },
    { id: 2, name: 'Panadería', description: 'Productos de panadería', isActive: true },
    { id: 3, name: 'Lácteos', description: 'Productos lácteos', isActive: true },
    { id: 4, name: 'Carnes', description: 'Carnes y embutidos', isActive: true },
    { id: 5, name: 'Frutas y Verduras', description: 'Frutas y verduras frescas', isActive: true }
  ];
  res.json(categories);
});

// Rutas de ventas
app.post('/api/sales', (req, res) => {
  const sale = {
    id: nextSaleId++,
    invoiceNumber: generateInvoiceNumber(req.body.invoiceType),
    ...req.body,
    createdAt: new Date()
  };
  sales.push(sale);
  res.status(201).json(sale);
});

app.get('/api/sales', (req, res) => {
  let filteredSales = [...sales];
  
  if (req.query.startDate) {
    const startDate = new Date(req.query.startDate);
    filteredSales = filteredSales.filter(s => new Date(s.createdAt) >= startDate);
  }
  
  if (req.query.endDate) {
    const endDate = new Date(req.query.endDate);
    endDate.setHours(23, 59, 59, 999);
    filteredSales = filteredSales.filter(s => new Date(s.createdAt) <= endDate);
  }
  
  if (req.query.cashierId) {
    filteredSales = filteredSales.filter(s => s.cashierId === parseInt(req.query.cashierId));
  }
  
  if (req.query.invoiceType) {
    filteredSales = filteredSales.filter(s => s.invoiceType === req.query.invoiceType);
  }
  
  if (req.query.status) {
    filteredSales = filteredSales.filter(s => s.status === req.query.status);
  }
  
  res.json(filteredSales);
});

app.get('/api/sales/summary', (req, res) => {
  let filteredSales = [...sales];
  
  if (req.query.startDate) {
    const startDate = new Date(req.query.startDate);
    filteredSales = filteredSales.filter(s => new Date(s.createdAt) >= startDate);
  }
  
  if (req.query.endDate) {
    const endDate = new Date(req.query.endDate);
    endDate.setHours(23, 59, 59, 999);
    filteredSales = filteredSales.filter(s => new Date(s.createdAt) <= endDate);
  }
  
  if (req.query.cashierId) {
    filteredSales = filteredSales.filter(s => s.cashierId === parseInt(req.query.cashierId));
  }
  
  const totalSales = filteredSales.reduce((sum, sale) => sum + sale.total, 0);
  const totalTransactions = filteredSales.length;
  const averageTicket = totalTransactions > 0 ? totalSales / totalTransactions : 0;
  
  const salesByPaymentMethod = {
    cash: filteredSales.filter(s => s.paymentMethod === 'cash').reduce((sum, sale) => sum + sale.total, 0),
    card: filteredSales.filter(s => s.paymentMethod === 'card').reduce((sum, sale) => sum + sale.total, 0),
    transfer: filteredSales.filter(s => s.paymentMethod === 'transfer').reduce((sum, sale) => sum + sale.total, 0)
  };
  
  // Calcular ventas por tipo de documento fiscal dinámicamente
  const salesByInvoiceType = {};
  filteredSales.forEach(sale => {
    if (!salesByInvoiceType[sale.invoiceType]) {
      salesByInvoiceType[sale.invoiceType] = 0;
    }
    salesByInvoiceType[sale.invoiceType] += sale.total;
  });
  
  res.json({
    totalSales,
    totalTransactions,
    averageTicket,
    salesByPaymentMethod,
    salesByInvoiceType
  });
});

// Rutas de usuarios
app.get('/api/users', (req, res) => {
  const usersResponse = users.map(user => ({
    id: user.id,
    username: user.username,
    name: user.name,
    email: user.email,
    role: user.role,
    isActive: user.isActive,
    createdAt: user.createdAt,
    lastLogin: user.lastLogin
  }));
  res.json(usersResponse);
});

app.post('/api/users', (req, res) => {
  const newUser = {
    id: users.length + 1,
    ...req.body,
    createdAt: new Date(),
    lastLogin: null
  };
  users.push(newUser);
  res.status(201).json(newUser);
});

app.put('/api/users/:id', (req, res) => {
  const index = users.findIndex(u => u.id === parseInt(req.params.id));
  if (index !== -1) {
    users[index] = { ...users[index], ...req.body };
    res.json(users[index]);
  } else {
    res.status(404).json({ message: 'Usuario no encontrado' });
  }
});

// Función para generar número de factura
function generateInvoiceNumber(type) {
  const prefix = type === 'credito_fiscal' ? 'CF' : 'CF';
  const date = new Date();
  const year = date.getFullYear().toString().slice(-2);
  const month = (date.getMonth() + 1).toString().padStart(2, '0');
  const day = date.getDate().toString().padStart(2, '0');
  const random = Math.floor(Math.random() * 1000).toString().padStart(3, '0');
  
  return `${prefix}-${year}${month}${day}-${random}`;
}

// Iniciar servidor
app.listen(PORT, () => {
  console.log(`🚀 Mock Backend corriendo en http://localhost:${PORT}`);
  console.log(`📊 API disponible en http://localhost:${PORT}/api`);
  console.log(`👤 Usuarios de prueba:`);
  console.log(`   Admin: admin / admin123`);
  console.log(`   Cajero: cajero1 / cajero123`);
});

module.exports = app;
