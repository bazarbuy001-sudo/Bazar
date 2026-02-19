// ===========================================
// TYPES.TS - Общие типы для backend
// ===========================================

export interface ApiResponse<T = unknown> {
  success: boolean;
  data?: T;
  error?: string;
  message?: string;
}

export interface PaginatedResponse<T = unknown> extends ApiResponse<T[]> {
  data: T[];
  items?: T[];  // Добавлено для совместимости
  total?: number;  // Добавлено для совместимости
  page?: number;  // Добавлено для совместимости
  pageSize?: number;  // Добавлено для совместимости
  totalPages?: number;  // Добавлено для совместимости
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

// Продукт
export interface Product {
  id: string;
  publicId?: string;
  name: string;
  sku?: string;  // Добавлено для совместимости
  categoryId?: string;  // Добавлено для совместимости  
  description?: string;
  price: number;
  oldPrice?: number;
  currency?: string;  // Добавлено для совместимости
  category: string;
  subcategory?: string;
  supplier?: string;  // Добавлено для совместимости
  rollLength?: number;  // Добавлено для совместимости
  images: string[];
  colors: Array<{
    name: string;
    hex: string;
  }>;
  attributes?: {
    minCut?: number;
    metersPerRoll?: number;
    width?: number;
    composition?: string;
    weave?: string;
  };
  status: 'active' | 'inactive' | 'sale' | 'coming_soon';
  stock?: number;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

// Корзина
export interface CartItem {
  id: string;
  productId: string;
  fabricId?: string;  // Алиас для productId (для совместимости)
  product: Product;
  color: string;
  meters: number;
  rolls: number;
  pricePerMeter: number;
  total: number;
  totalPrice?: number;  // Алиас для total (для совместимости)
}

export interface Cart {
  id: string;
  clientId?: string;
  sessionId: string;
  items: CartItem[];
  subtotal: number;
  total: number;
  totalAmount?: number;  // Алиас для total (для совместимости)
  itemCount?: number;    // Количество товаров в корзине
  createdAt: string;
  updatedAt: string;
}

// Заказ
export interface OrderCreateRequest {
  cartId: string;
  contactInfo: {
    name: string;
    email: string;
    phone: string;
    company?: string;
    inn?: string;
  };
  notes?: string;
}

export interface Order {
  id: string;
  publicId: string;
  clientId?: string;
  items: OrderItem[];
  status: 'pending' | 'confirmed' | 'processing' | 'shipped' | 'delivered' | 'cancelled';
  subtotal: number;
  total: number;
  contactInfo: {
    name: string;
    email: string;
    phone: string;
    company?: string;
    inn?: string;
  };
  notes?: string;
  createdAt: string;
  updatedAt: string;
}

export interface OrderItem {
  id: string;
  orderId: string;
  productId: string;
  product: Product;
  color: string;
  requestedMeters: number;
  fulfilledMeters?: number;
  rolls: number;
  pricePerMeter: number;
  total: number;
}

// Фильтры для каталога
export interface FilterOptions {
  category?: string;
  subcategory?: string;
  priceMin?: number;
  priceMax?: number;
  minPrice?: number;  // Алиас для priceMin
  maxPrice?: number;  // Алиас для priceMax
  colors?: string[];
  status?: string;
  search?: string;    // Текстовый поиск
  sortBy?: 'name' | 'price' | 'created' | 'updated' | 'newest';
  sortOrder?: 'asc' | 'desc';
  page?: number;
  limit?: number;
  pageSize?: number;  // Алиас для limit
}

// Клиент
export interface Client {
  id: string;
  publicId: string;
  email: string;
  name: string;
  phone?: string;
  city?: string;
  inn?: string;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

// Админ пользователь
export interface AdminUser {
  id: string;
  publicId: string;
  email: string;
  role: 'admin' | 'superadmin' | 'manager';
  name?: string;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}