// Common Types and Interfaces

export interface ApiResponse<T> {
  success: boolean;
  data?: T;
  error?: string;
  message?: string;
  requestId?: string;
}

export interface PaginatedResponse<T> {
  items: T[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
}

export interface Product {
  id: string;
  name: string;
  description?: string;
  sku: string;
  categoryId: string;
  category: string;
  supplier?: string;
  price: number;
  currency: string;
  stock: number;
  images: string[];
  colors: string[];
  rollLength?: number; // Длина рулона в метрах
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface CartItem {
  fabricId: string;
  color: string;
  meters: number;
  pricePerMeter: number;
  totalPrice: number;
}

export interface Cart {
  items: CartItem[];
  totalAmount: number;
  itemCount: number;
}

export interface OrderCreateRequest {
  items: {
    fabricId: string;
    color: string;
    requestedMeters: number;
    unitPricePerMeter: number;
  }[];
  shippingAddress: {
    street: string;
    city: string;
    region: string;
    postalCode: string;
    country: string;
  };
  notes?: string;
}

export interface ApiError extends Error {
  status?: number;
  requestId?: string;
}

export interface FilterOptions {
  category?: string;
  minPrice?: number;
  maxPrice?: number;
  colors?: string[];
  sortBy?: 'price' | 'name' | 'newest' | 'popularity';
  sortOrder?: 'asc' | 'desc';
  page?: number;
  pageSize?: number;
  search?: string;
}

export interface AuthPayload {
  clientId?: string;
  adminUserId?: string;
  role?: string;
  iat?: number;
  exp?: number;
}
