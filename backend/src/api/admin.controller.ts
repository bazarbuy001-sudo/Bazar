import { Request, Response } from 'express';
import { generateJWT } from '../middleware/auth';

/**
 * Mock Admin Users
 */
const mockAdmins = [
  {
    id: 'admin-001',
    email: 'admin@fabrics.local',
    password: 'admin123', // In production: use bcrypt
    name: 'Admin User',
    role: 'superadmin',
  },
  {
    id: 'admin-002',
    email: 'manager@fabrics.local',
    password: 'manager123',
    name: 'Manager User',
    role: 'manager',
  },
];

/**
 * Mock Products
 */
const mockProducts = [
  {
    id: 'fabric-001',
    name: 'Хлопковая ткань белая',
    sku: 'HLB-001',
    category: 'Ткани',
    price: 150,
    stock: 100,
    supplier: 'Производитель №1',
    colors: ['белый'],
    rollLength: 25,
    isActive: true,
    image: '/images/fabric-1.jpg',
  },
  {
    id: 'fabric-002',
    name: 'Льняная ткань синяя',
    sku: 'LYN-001',
    category: 'Ткани',
    price: 200,
    stock: 50,
    supplier: 'Производитель №2',
    colors: ['синий'],
    rollLength: 20,
    isActive: true,
    image: '/images/fabric-2.jpg',
  },
  {
    id: 'fabric-003',
    name: 'Шелковая ткань красная',
    sku: 'SHL-001',
    category: 'Ткани',
    price: 350,
    stock: 30,
    supplier: 'Производитель №3',
    colors: ['красный'],
    rollLength: 15,
    isActive: true,
    image: '/images/fabric-3.jpg',
  },
];

/**
 * Mock Orders
 */
const mockOrders = [
  {
    id: 'order-001',
    orderNumber: '#ORD-2024-001',
    clientEmail: 'client1@example.com',
    clientName: 'Иван Петров',
    clientPhone: '+7-999-123-4567',
    totalPrice: 4500,
    status: 'pending',
    items: [
      { fabricId: 'fabric-001', quantity: 10, price: 150 },
      { fabricId: 'fabric-002', quantity: 5, price: 200 },
    ],
    createdAt: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000).toISOString(),
    updatedAt: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000).toISOString(),
  },
  {
    id: 'order-002',
    orderNumber: '#ORD-2024-002',
    clientEmail: 'client2@example.com',
    clientName: 'Мария Сидорова',
    clientPhone: '+7-999-234-5678',
    totalPrice: 7000,
    status: 'shipped',
    items: [
      { fabricId: 'fabric-003', quantity: 20, price: 350 },
    ],
    createdAt: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000).toISOString(),
    updatedAt: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString(),
  },
  {
    id: 'order-003',
    orderNumber: '#ORD-2024-003',
    clientEmail: 'client3@example.com',
    clientName: 'Петр Иванов',
    clientPhone: '+7-999-345-6789',
    totalPrice: 3000,
    status: 'delivered',
    items: [
      { fabricId: 'fabric-001', quantity: 20, price: 150 },
    ],
    createdAt: new Date(Date.now() - 10 * 24 * 60 * 60 * 1000).toISOString(),
    updatedAt: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000).toISOString(),
  },
];

/**
 * Mock Clients
 */
const mockClients = [
  {
    id: 'client-001',
    name: 'Иван Петров',
    email: 'client1@example.com',
    phone: '+7-999-123-4567',
    company: 'ООО Текстиль',
    city: 'Москва',
    totalOrders: 5,
    totalSpent: 25000,
    status: 'active',
    joinedAt: new Date(Date.now() - 90 * 24 * 60 * 60 * 1000).toISOString(),
  },
  {
    id: 'client-002',
    name: 'Мария Сидорова',
    email: 'client2@example.com',
    phone: '+7-999-234-5678',
    company: 'ТОО Мода',
    city: 'Алматы',
    totalOrders: 12,
    totalSpent: 89000,
    status: 'active',
    joinedAt: new Date(Date.now() - 180 * 24 * 60 * 60 * 1000).toISOString(),
  },
  {
    id: 'client-003',
    name: 'Петр Иванов',
    email: 'client3@example.com',
    phone: '+7-999-345-6789',
    company: 'ИП Дизайн',
    city: 'Бишкек',
    totalOrders: 3,
    totalSpent: 12000,
    status: 'active',
    joinedAt: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString(),
  },
  {
    id: 'client-004',
    name: 'Алиса Кузнецова',
    email: 'client4@example.com',
    phone: '+7-999-456-7890',
    company: 'ООО Фабрика',
    city: 'СПб',
    totalOrders: 8,
    totalSpent: 45000,
    status: 'active',
    joinedAt: new Date(Date.now() - 60 * 24 * 60 * 60 * 1000).toISOString(),
  },
  {
    id: 'client-005',
    name: 'Дмитрий Волков',
    email: 'client5@example.com',
    phone: '+7-999-567-8901',
    company: 'ТОО Дизайн',
    city: 'Казахстан',
    totalOrders: 2,
    totalSpent: 8500,
    status: 'blocked',
    joinedAt: new Date(Date.now() - 15 * 24 * 60 * 60 * 1000).toISOString(),
  },
];

/**
 * Mock Chats and Messages
 */
const mockChats = [
  {
    id: 'chat-001',
    clientId: 'client-001',
    clientName: 'Иван Петров',
    lastMessage: 'Спасибо за ответ!',
    lastMessageTime: new Date(Date.now() - 30 * 60 * 1000).toISOString(),
    unreadCount: 0,
    createdAt: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString(),
  },
  {
    id: 'chat-002',
    clientId: 'client-002',
    clientName: 'Мария Сидорова',
    lastMessage: 'Когда будет доставка?',
    lastMessageTime: new Date(Date.now() - 2 * 60 * 1000).toISOString(),
    unreadCount: 2,
    createdAt: new Date(Date.now() - 20 * 24 * 60 * 60 * 1000).toISOString(),
  },
  {
    id: 'chat-003',
    clientId: 'client-003',
    clientName: 'Петр Иванов',
    lastMessage: 'Спасибо!',
    lastMessageTime: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000).toISOString(),
    unreadCount: 0,
    createdAt: new Date(Date.now() - 45 * 24 * 60 * 60 * 1000).toISOString(),
  },
];

const mockChatMessages: { [key: string]: any[] } = {
  'chat-001': [
    {
      id: 'msg-001',
      chatId: 'chat-001',
      sender: 'client',
      senderName: 'Иван Петров',
      message: 'Здравствуйте, интересует хлопковая ткань',
      timestamp: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString(),
    },
    {
      id: 'msg-002',
      chatId: 'chat-001',
      sender: 'admin',
      senderName: 'Admin',
      message: 'Здравствуйте! Какой размер вам нужен?',
      timestamp: new Date(Date.now() - 29 * 24 * 60 * 60 * 1000).toISOString(),
    },
    {
      id: 'msg-003',
      chatId: 'chat-001',
      sender: 'client',
      senderName: 'Иван Петров',
      message: 'Мне нужно 50 метров',
      timestamp: new Date(Date.now() - 28 * 24 * 60 * 60 * 1000).toISOString(),
    },
    {
      id: 'msg-004',
      chatId: 'chat-001',
      sender: 'admin',
      senderName: 'Admin',
      message: 'Спасибо за ответ!',
      timestamp: new Date(Date.now() - 27 * 24 * 60 * 60 * 1000).toISOString(),
    },
  ],
  'chat-002': [
    {
      id: 'msg-005',
      chatId: 'chat-002',
      sender: 'client',
      senderName: 'Мария Сидорова',
      message: 'Заказала вчера, когда будет доставка?',
      timestamp: new Date(Date.now() - 2 * 60 * 1000).toISOString(),
    },
    {
      id: 'msg-006',
      chatId: 'chat-002',
      sender: 'admin',
      senderName: 'Admin',
      message: 'Доставка ожидается через 3 дня',
      timestamp: new Date(Date.now() - 60 * 1000).toISOString(),
    },
  ],
  'chat-003': [
    {
      id: 'msg-007',
      chatId: 'chat-003',
      sender: 'client',
      senderName: 'Петр Иванов',
      message: 'Спасибо за помощь',
      timestamp: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000).toISOString(),
    },
  ],
};

/**
 * ==================== AUTH ====================
 */

/**
 * POST /api/v1/admin/login
 * Authenticate admin user
 */
export const login = (req: Request, res: Response): void => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      res.status(400).json({
        success: false,
        error: 'Email and password required',
      });
      return;
    }

    const admin = mockAdmins.find((a) => a.email === email && a.password === password);

    if (!admin) {
      res.status(401).json({
        success: false,
        error: 'Invalid email or password',
      });
      return;
    }

    const token = generateJWT({
      id: admin.id,
      email: admin.email,
      name: admin.name,
      role: admin.role,
    });

    res.json({
      success: true,
      token,
      user: {
        id: admin.id,
        email: admin.email,
        name: admin.name,
        role: admin.role,
      },
    });
  } catch (error: any) {
    res.status(500).json({
      success: false,
      error: error.message || 'Internal server error',
    });
  }
};

/**
 * POST /api/v1/admin/logout
 * Logout admin user
 */
export const logout = (_req: Request, res: Response): void => {
  // In a real app, you might blacklist the token here
  res.json({
    success: true,
    message: 'Logged out successfully',
  });
};

/**
 * ==================== PRODUCTS ====================
 */

/**
 * GET /api/v1/admin/products
 * Get all products with optional filters
 */
export const getProducts = (req: Request, res: Response): void => {
  try {
    let products = [...mockProducts];

    // Filter by search
    const { search, category, status } = req.query;

    if (search) {
      const q = (search as string).toLowerCase();
      products = products.filter(
        (p) => p.name.toLowerCase().includes(q) || p.sku.toLowerCase().includes(q)
      );
    }

    if (category) {
      products = products.filter((p) => p.category === category);
    }

    if (status === 'active') {
      products = products.filter((p) => p.isActive);
    } else if (status === 'inactive') {
      products = products.filter((p) => !p.isActive);
    }

    res.json({
      success: true,
      data: products,
      total: products.length,
    });
  } catch (error: any) {
    res.status(500).json({
      success: false,
      error: error.message || 'Internal server error',
    });
  }
};

/**
 * POST /api/v1/admin/products
 * Create new product
 */
export const createProduct = (req: Request, res: Response): void => {
  try {
    const { name, sku, category, price, stock, supplier, colors, rollLength } = req.body;

    if (!name || !sku || !category || price === undefined) {
      res.status(400).json({
        success: false,
        error: 'Missing required fields',
      });
      return;
    }

    const newProduct = {
      id: `fabric-${Date.now()}`,
      name,
      sku,
      category,
      price: Number(price),
      stock: Number(stock) || 0,
      supplier: supplier || '',
      colors: colors || [],
      rollLength: Number(rollLength) || 0,
      isActive: true,
      image: '/images/default.jpg',
    };

    mockProducts.push(newProduct);

    res.status(201).json({
      success: true,
      message: 'Product created successfully',
      data: newProduct,
    });
  } catch (error: any) {
    res.status(500).json({
      success: false,
      error: error.message || 'Internal server error',
    });
  }
};

/**
 * PUT /api/v1/admin/products/:id
 * Update product
 */
export const updateProduct = (req: Request, res: Response): void => {
  try {
    const { id } = req.params;
    const updates = req.body;

    const productIndex = mockProducts.findIndex((p) => p.id === id);

    if (productIndex === -1) {
      res.status(404).json({
        success: false,
        error: 'Product not found',
      });
      return;
    }

    const updatedProduct = {
      ...mockProducts[productIndex],
      ...updates,
    };

    mockProducts[productIndex] = updatedProduct;

    res.json({
      success: true,
      message: 'Product updated successfully',
      data: updatedProduct,
    });
  } catch (error: any) {
    res.status(500).json({
      success: false,
      error: error.message || 'Internal server error',
    });
  }
};

/**
 * DELETE /api/v1/admin/products/:id
 * Delete product
 */
export const deleteProduct = (req: Request, res: Response): void => {
  try {
    const { id } = req.params;

    const productIndex = mockProducts.findIndex((p) => p.id === id);

    if (productIndex === -1) {
      res.status(404).json({
        success: false,
        error: 'Product not found',
      });
      return;
    }

    const deletedProduct = mockProducts.splice(productIndex, 1);

    res.json({
      success: true,
      message: 'Product deleted successfully',
      data: deletedProduct[0],
    });
  } catch (error: any) {
    res.status(500).json({
      success: false,
      error: error.message || 'Internal server error',
    });
  }
};

/**
 * ==================== ORDERS ====================
 */

/**
 * GET /api/v1/admin/orders
 * Get all orders with optional filters
 */
export const getOrders = (req: Request, res: Response): void => {
  try {
    let orders = [...mockOrders];

    const { status, search } = req.query;

    if (status) {
      orders = orders.filter((o) => o.status === status);
    }

    if (search) {
      const q = (search as string).toLowerCase();
      orders = orders.filter(
        (o) =>
          o.orderNumber.toLowerCase().includes(q) ||
          o.clientEmail.toLowerCase().includes(q) ||
          o.clientName.toLowerCase().includes(q)
      );
    }

    // Sort by newest first
    orders.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

    res.json({
      success: true,
      data: orders,
      total: orders.length,
    });
  } catch (error: any) {
    res.status(500).json({
      success: false,
      error: error.message || 'Internal server error',
    });
  }
};

/**
 * PUT /api/v1/admin/orders/:id
 * Update order status
 */
export const updateOrder = (req: Request, res: Response): void => {
  try {
    const { id } = req.params;
    const { status } = req.body;

    const validStatuses = ['pending', 'processing', 'shipped', 'delivered', 'cancelled'];

    if (!status || !validStatuses.includes(status)) {
      res.status(400).json({
        success: false,
        error: 'Invalid status provided',
      });
      return;
    }

    const orderIndex = mockOrders.findIndex((o) => o.id === id);

    if (orderIndex === -1) {
      res.status(404).json({
        success: false,
        error: 'Order not found',
      });
      return;
    }

    mockOrders[orderIndex].status = status;
    mockOrders[orderIndex].updatedAt = new Date().toISOString();

    res.json({
      success: true,
      message: 'Order updated successfully',
      data: mockOrders[orderIndex],
    });
  } catch (error: any) {
    res.status(500).json({
      success: false,
      error: error.message || 'Internal server error',
    });
  }
};

/**
 * ==================== CLIENTS ====================
 */

/**
 * GET /api/v1/admin/clients
 * Get all clients with optional filters
 */
export const getClients = (req: Request, res: Response): void => {
  try {
    let clients = [...mockClients];

    const { search, status } = req.query;

    if (search) {
      const q = (search as string).toLowerCase();
      clients = clients.filter(
        (c) =>
          c.name.toLowerCase().includes(q) ||
          c.email.toLowerCase().includes(q) ||
          c.phone.includes(q)
      );
    }

    if (status) {
      clients = clients.filter((c) => c.status === status);
    }

    // Sort by newest first
    clients.sort((a, b) => new Date(b.joinedAt).getTime() - new Date(a.joinedAt).getTime());

    res.json({
      success: true,
      data: clients,
      total: clients.length,
    });
  } catch (error: any) {
    res.status(500).json({
      success: false,
      error: error.message || 'Internal server error',
    });
  }
};

/**
 * ==================== DASHBOARD ====================
 */

/**
 * GET /api/v1/admin/dashboard
 * Get dashboard metrics
 */
export const getDashboard = (_req: Request, res: Response): void => {
  try {
    const totalOrders = mockOrders.length;
    const totalClients = mockClients.length;
    const totalProducts = mockProducts.length;
    const totalRevenue = mockOrders.reduce((sum, o) => sum + o.totalPrice, 0);

    const ordersToday = mockOrders.filter((o) => {
      const orderDate = new Date(o.createdAt);
      const today = new Date();
      return (
        orderDate.getFullYear() === today.getFullYear() &&
        orderDate.getMonth() === today.getMonth() &&
        orderDate.getDate() === today.getDate()
      );
    }).length;

    const statusCounts = {
      pending: mockOrders.filter((o) => o.status === 'pending').length,
      processing: mockOrders.filter((o) => o.status === 'processing').length,
      shipped: mockOrders.filter((o) => o.status === 'shipped').length,
      delivered: mockOrders.filter((o) => o.status === 'delivered').length,
      cancelled: mockOrders.filter((o) => o.status === 'cancelled').length,
    };

    const lowStockProducts = mockProducts.filter((p) => p.stock < 20);

    res.json({
      success: true,
      data: {
        summary: {
          totalOrders,
          totalClients,
          totalProducts,
          totalRevenue,
          ordersToday,
        },
        ordersByStatus: statusCounts,
        lowStockProducts: lowStockProducts.slice(0, 5),
        recentOrders: mockOrders.slice(0, 5),
      },
    });
  } catch (error: any) {
    res.status(500).json({
      success: false,
      error: error.message || 'Internal server error',
    });
  }
};

/**
 * ==================== PRODUCT IMAGES ====================
 */

/**
 * Mock storage for images (in-memory)
 */
const mockProductImages: { [key: string]: any[] } = {};

/**
 * POST /api/v1/admin/products/upload
 * Upload product images
 */
export const uploadProductImages = (req: Request, res: Response): void => {
  try {
    const { productId } = req.body;
    const files = (req as any).files as any[];

    if (!productId) {
      res.status(400).json({
        success: false,
        error: 'Product ID is required',
      });
      return;
    }

    // Check if product exists
    const product = mockProducts.find((p) => p.id === productId);
    if (!product) {
      res.status(404).json({
        success: false,
        error: 'Product not found',
      });
      return;
    }

    if (!files || files.length === 0) {
      res.status(400).json({
        success: false,
        error: 'No files uploaded',
      });
      return;
    }

    const uploadedImages: any[] = [];

    // Process each uploaded file
    files.forEach((file, index) => {
      const isMain = req.body[`image_${index}_isMain`] === 'true';

      // Generate unique filename
      const timestamp = Date.now();
      const random = Math.random().toString(36).substring(7);
      const ext = file.originalname.split('.').pop() || 'jpg';
      const filename = `${productId}-${timestamp}-${random}.${ext}`;

      // Create image object (in real app, save to disk)
      const imageObject = {
        id: `img-${Date.now()}-${index}`,
        fabricId: productId,
        url: `/uploads/${filename}`,
        filename: filename,
        originalName: file.originalname,
        mimeType: file.mimetype,
        size: file.size,
        isMain: isMain,
        uploadedAt: new Date().toISOString(),
        buffer: file.buffer,
      };

      uploadedImages.push(imageObject);
    });

    // Store images in mock storage
    mockProductImages[productId] = uploadedImages;

    // Update product with image references
    if (product) {
      (product as any).images = uploadedImages.map((img) => ({
        id: img.id,
        url: img.url,
        name: img.originalName,
        isMain: img.isMain,
      }));
    }

    res.json({
      success: true,
      message: 'Images uploaded successfully',
      data: {
        fabricId: productId,
        images: uploadedImages.map((img) => ({
          id: img.id,
          url: img.url,
          name: img.originalName,
          isMain: img.isMain,
        })),
      },
    });
  } catch (error: any) {
    res.status(500).json({
      success: false,
      error: error.message || 'Internal server error',
    });
  }
};

/**
 * ==================== NEW ENDPOINTS (12 MISSING) ====================
 */

/**
 * 1. GET /api/v1/admin/products/:id
 * Get single product by ID
 */
export const getProductById = (req: Request, res: Response): void => {
  try {
    const { id } = req.params;

    const product = mockProducts.find((p) => p.id === id);

    if (!product) {
      res.status(404).json({
        success: false,
        error: 'Product not found',
      });
      return;
    }

    res.json({
      success: true,
      data: {
        ...product,
        images: mockProductImages[id] || [],
      },
    });
  } catch (error: any) {
    res.status(500).json({
      success: false,
      error: error.message || 'Internal server error',
    });
  }
};

/**
 * 2. POST /api/v1/admin/products/import
 * Import products from JSON
 */
export const importProducts = (req: Request, res: Response): void => {
  try {
    const { products } = req.body;

    if (!Array.isArray(products)) {
      res.status(400).json({
        success: false,
        error: 'Products must be an array',
      });
      return;
    }

    if (products.length === 0) {
      res.status(400).json({
        success: false,
        error: 'No products provided',
      });
      return;
    }

    const imported: any[] = [];
    const errors: any[] = [];

    products.forEach((product, index) => {
      // Validate required fields
      if (!product.name || !product.sku || !product.category || product.price === undefined) {
        errors.push({
          index,
          error: 'Missing required fields: name, sku, category, price',
        });
        return;
      }

      // Check for duplicate SKU
      if (mockProducts.some((p) => p.sku === product.sku)) {
        errors.push({
          index,
          sku: product.sku,
          error: 'Product with this SKU already exists',
        });
        return;
      }

      // Create new product
      const newProduct = {
        id: `fabric-${Date.now()}-${index}`,
        name: product.name,
        sku: product.sku,
        category: product.category,
        price: Number(product.price),
        stock: Number(product.stock) || 0,
        supplier: product.supplier || '',
        colors: product.colors || [],
        rollLength: Number(product.rollLength) || 0,
        isActive: product.isActive !== false,
        image: product.image || '/images/default.jpg',
      };

      mockProducts.push(newProduct);
      imported.push(newProduct);
    });

    res.json({
      success: errors.length === 0,
      message: `Imported ${imported.length} products${errors.length > 0 ? ` with ${errors.length} errors` : ''}`,
      data: {
        imported: imported.length,
        failed: errors.length,
        products: imported,
        errors: errors,
      },
    });
  } catch (error: any) {
    res.status(500).json({
      success: false,
      error: error.message || 'Internal server error',
    });
  }
};

/**
 * 3. GET /api/v1/admin/orders/:id
 * Get single order details
 */
export const getOrderById = (req: Request, res: Response): void => {
  try {
    const { id } = req.params;

    const order = mockOrders.find((o) => o.id === id);

    if (!order) {
      res.status(404).json({
        success: false,
        error: 'Order not found',
      });
      return;
    }

    res.json({
      success: true,
      data: order,
    });
  } catch (error: any) {
    res.status(500).json({
      success: false,
      error: error.message || 'Internal server error',
    });
  }
};

/**
 * 4. GET /api/v1/admin/orders/stats
 * Get order statistics and metrics
 */
export const getOrderStats = (_req: Request, res: Response): void => {
  try {
    const today = new Date();
    const thisMonth = new Date(today.getFullYear(), today.getMonth(), 1);
    const thisYear = new Date(today.getFullYear(), 0, 1);

    const stats = {
      total: mockOrders.length,
      todayCount: mockOrders.filter((o) => {
        const oDate = new Date(o.createdAt);
        return oDate.toDateString() === today.toDateString();
      }).length,
      thisMonthCount: mockOrders.filter((o) => {
        const oDate = new Date(o.createdAt);
        return oDate >= thisMonth && oDate <= today;
      }).length,
      thisYearCount: mockOrders.filter((o) => {
        const oDate = new Date(o.createdAt);
        return oDate >= thisYear && oDate <= today;
      }).length,
      totalRevenue: mockOrders.reduce((sum, o) => sum + o.totalPrice, 0),
      todayRevenue: mockOrders
        .filter((o) => {
          const oDate = new Date(o.createdAt);
          return oDate.toDateString() === today.toDateString();
        })
        .reduce((sum, o) => sum + o.totalPrice, 0),
      thisMonthRevenue: mockOrders
        .filter((o) => {
          const oDate = new Date(o.createdAt);
          return oDate >= thisMonth && oDate <= today;
        })
        .reduce((sum, o) => sum + o.totalPrice, 0),
      byStatus: {
        pending: mockOrders.filter((o) => o.status === 'pending').length,
        processing: mockOrders.filter((o) => o.status === 'processing').length,
        shipped: mockOrders.filter((o) => o.status === 'shipped').length,
        delivered: mockOrders.filter((o) => o.status === 'delivered').length,
        cancelled: mockOrders.filter((o) => o.status === 'cancelled').length,
      },
      averageOrderValue: mockOrders.length > 0 ? 
        Math.round(mockOrders.reduce((sum, o) => sum + o.totalPrice, 0) / mockOrders.length) : 0,
    };

    res.json({
      success: true,
      data: stats,
    });
  } catch (error: any) {
    res.status(500).json({
      success: false,
      error: error.message || 'Internal server error',
    });
  }
};

/**
 * 5. GET /api/v1/admin/clients/:id
 * Get client profile
 */
export const getClientById = (req: Request, res: Response): void => {
  try {
    const { id } = req.params;

    const client = mockClients.find((c) => c.id === id);

    if (!client) {
      res.status(404).json({
        success: false,
        error: 'Client not found',
      });
      return;
    }

    res.json({
      success: true,
      data: client,
    });
  } catch (error: any) {
    res.status(500).json({
      success: false,
      error: error.message || 'Internal server error',
    });
  }
};

/**
 * 6. PUT /api/v1/admin/clients/:id
 * Update client profile
 */
export const updateClient = (req: Request, res: Response): void => {
  try {
    const { id } = req.params;
    const updates = req.body;

    const client = mockClients.find((c) => c.id === id);

    if (!client) {
      res.status(404).json({
        success: false,
        error: 'Client not found',
      });
      return;
    }

    // Prevent status field from being updated by this endpoint (use block endpoint)
    const { status, ...safeUpdates } = updates;

    const updated = Object.assign(client, safeUpdates);

    res.json({
      success: true,
      message: 'Client updated successfully',
      data: updated,
    });
  } catch (error: any) {
    res.status(500).json({
      success: false,
      error: error.message || 'Internal server error',
    });
  }
};

/**
 * 7. PUT /api/v1/admin/clients/:id/block
 * Block/unblock client
 */
export const blockClient = (req: Request, res: Response): void => {
  try {
    const { id } = req.params;
    const { block } = req.body;

    if (typeof block !== 'boolean') {
      res.status(400).json({
        success: false,
        error: 'block field must be a boolean',
      });
      return;
    }

    const client = mockClients.find((c) => c.id === id);

    if (!client) {
      res.status(404).json({
        success: false,
        error: 'Client not found',
      });
      return;
    }

    client.status = block ? 'blocked' : 'active';

    res.json({
      success: true,
      message: `Client ${block ? 'blocked' : 'unblocked'} successfully`,
      data: client,
    });
  } catch (error: any) {
    res.status(500).json({
      success: false,
      error: error.message || 'Internal server error',
    });
  }
};

/**
 * 8. GET /api/v1/admin/clients/:id/orders
 * Get client's orders
 */
export const getClientOrders = (req: Request, res: Response): void => {
  try {
    const { id } = req.params;

    // Check if client exists
    const client = mockClients.find((c) => c.id === id);

    if (!client) {
      res.status(404).json({
        success: false,
        error: 'Client not found',
      });
      return;
    }

    // Find orders for this client
    const clientOrders = mockOrders.filter((o) => {
      const orderClient = mockClients.find((c) => c.email === o.clientEmail);
      return orderClient?.id === id;
    });

    res.json({
      success: true,
      data: clientOrders,
      total: clientOrders.length,
    });
  } catch (error: any) {
    res.status(500).json({
      success: false,
      error: error.message || 'Internal server error',
    });
  }
};

/**
 * 9. GET /api/v1/admin/chats
 * Get all chats list
 */
export const getChats = (req: Request, res: Response): void => {
  try {
    const { search } = req.query;

    let chats = [...mockChats];

    if (search) {
      const q = (search as string).toLowerCase();
      chats = chats.filter((c) => c.clientName.toLowerCase().includes(q));
    }

    // Sort by lastMessageTime (newest first)
    chats.sort(
      (a, b) =>
        new Date(b.lastMessageTime).getTime() - new Date(a.lastMessageTime).getTime()
    );

    res.json({
      success: true,
      data: chats,
      total: chats.length,
    });
  } catch (error: any) {
    res.status(500).json({
      success: false,
      error: error.message || 'Internal server error',
    });
  }
};

/**
 * 10. GET /api/v1/admin/chats/:id/messages
 * Get chat messages history
 */
export const getChatMessages = (req: Request, res: Response): void => {
  try {
    const { id } = req.params;
    const { limit = 50, offset = 0 } = req.query;

    const chat = mockChats.find((c) => c.id === id);

    if (!chat) {
      res.status(404).json({
        success: false,
        error: 'Chat not found',
      });
      return;
    }

    const messages = mockChatMessages[id] || [];
    const start = Number(offset);
    const end = start + Number(limit);
    const paginatedMessages = messages.slice(start, end);

    res.json({
      success: true,
      data: paginatedMessages,
      total: messages.length,
      limit: Number(limit),
      offset: Number(offset),
    });
  } catch (error: any) {
    res.status(500).json({
      success: false,
      error: error.message || 'Internal server error',
    });
  }
};

/**
 * 11. POST /api/v1/admin/chats/:id/messages
 * Send message in chat
 */
export const sendChatMessage = (req: Request, res: Response): void => {
  try {
    const { id } = req.params;
    const { message } = req.body;

    if (!message) {
      res.status(400).json({
        success: false,
        error: 'Message is required',
      });
      return;
    }

    const chat = mockChats.find((c) => c.id === id);

    if (!chat) {
      res.status(404).json({
        success: false,
        error: 'Chat not found',
      });
      return;
    }

    const newMessage = {
      id: `msg-${Date.now()}`,
      chatId: id,
      sender: 'admin',
      senderName: 'Admin',
      message: message,
      timestamp: new Date().toISOString(),
    };

    if (!mockChatMessages[id]) {
      mockChatMessages[id] = [];
    }

    mockChatMessages[id].push(newMessage);

    // Update chat's last message
    chat.lastMessage = message;
    chat.lastMessageTime = newMessage.timestamp;

    res.status(201).json({
      success: true,
      message: 'Message sent successfully',
      data: newMessage,
    });
  } catch (error: any) {
    res.status(500).json({
      success: false,
      error: error.message || 'Internal server error',
    });
  }
};

/**
 * 12. POST /api/v1/admin/refresh-token
 * Refresh JWT token
 */
export const refreshToken = (req: Request, res: Response): void => {
  try {
    const { token } = req.body;

    if (!token) {
      res.status(400).json({
        success: false,
        error: 'Token is required',
      });
      return;
    }

    // In a real app, you would verify the old token and check if it's expired
    // For this mock implementation, we'll just generate a new token

    // Try to decode and extract user info from token
    const adminInfo: any = {
      id: 'admin-001',
      email: 'admin@fabrics.local',
      name: 'Admin User',
      role: 'superadmin',
    };

    try {
      // In a real app, use jwt.decode() or similar
      // const decoded = jwt.decode(token);
      // adminInfo = { ...adminInfo, ...decoded };
    } catch (e) {
      // Token might be invalid, but we'll still generate a new one
      // In production, throw error here
    }

    const newToken = generateJWT(adminInfo);

    res.json({
      success: true,
      message: 'Token refreshed successfully',
      token: newToken,
    });
  } catch (error: any) {
    res.status(500).json({
      success: false,
      error: error.message || 'Internal server error',
    });
  }
};
