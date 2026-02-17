import { Request, Response, NextFunction } from 'express';
import { prisma } from '../server';
import { ApiResponse, PaginatedResponse, Product, FilterOptions } from '../types';

// Mock products data for Phase 2 MVP
const mockProducts: Product[] = [
  {
    id: 'fabric-001',
    name: 'Хлопковая ткань белая',
    sku: 'HLB-001',
    categoryId: 'cat-fabrics',
    category: 'Ткани',
    supplier: 'Производитель №1',
    price: 150,
    currency: 'RUB',
    stock: 100,
    images: ['/images/fabric-1.jpg'],
    colors: ['белый'],
    rollLength: 25,
    isActive: true,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
  {
    id: 'fabric-002',
    name: 'Льняная ткань синяя',
    sku: 'LYN-001',
    categoryId: 'cat-fabrics',
    category: 'Ткани',
    supplier: 'Производитель №2',
    price: 200,
    currency: 'RUB',
    stock: 50,
    images: ['/images/fabric-2.jpg'],
    colors: ['синий'],
    rollLength: 20,
    isActive: true,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
  {
    id: 'fabric-003',
    name: 'Шелковая ткань красная',
    sku: 'SHL-001',
    categoryId: 'cat-fabrics',
    category: 'Ткани',
    supplier: 'Производитель №3',
    price: 350,
    currency: 'RUB',
    stock: 30,
    images: ['/images/fabric-3.jpg'],
    colors: ['красный'],
    rollLength: 15,
    isActive: true,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
  {
    id: 'fabric-004',
    name: 'Полиэстер черный',
    sku: 'PLY-001',
    categoryId: 'cat-fabrics',
    category: 'Ткани',
    supplier: 'Производитель №1',
    price: 120,
    currency: 'RUB',
    stock: 200,
    images: ['/images/fabric-4.jpg'],
    colors: ['черный'],
    rollLength: 30,
    isActive: true,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
  {
    id: 'furni-001',
    name: 'Пуговицы деревянные',
    sku: 'BTN-001',
    categoryId: 'cat-furni',
    category: 'Фурнитура',
    supplier: 'Производитель №4',
    price: 25,
    currency: 'RUB',
    stock: 1000,
    images: ['/images/button.jpg'],
    colors: ['коричневый', 'черный'],
    isActive: true,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
];

/**
 * GET /api/v1/products
 * Получить список товаров с фильтрацией
 * Фильтры: category, minPrice, maxPrice, colors, search, sortBy, page, pageSize
 */
export const getProducts = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const filters: FilterOptions = {
      category: req.query.category as string,
      minPrice: req.query.minPrice ? parseFloat(req.query.minPrice as string) : undefined,
      maxPrice: req.query.maxPrice ? parseFloat(req.query.maxPrice as string) : undefined,
      colors: req.query.colors ? (Array.isArray(req.query.colors) ? req.query.colors : [req.query.colors]) : undefined,
      search: req.query.search as string,
      sortBy: (req.query.sortBy as any) || 'popularity',
      sortOrder: (req.query.sortOrder as any) || 'asc',
      page: parseInt(req.query.page as string) || 1,
      pageSize: parseInt(req.query.pageSize as string) || 12,
    };

    // Apply filters
    let filtered = [...mockProducts];

    // Search filter
    if (filters.search) {
      filtered = filtered.filter((p) =>
        p.name.toLowerCase().includes(filters.search!.toLowerCase()) ||
        p.description?.toLowerCase().includes(filters.search!.toLowerCase())
      );
    }

    // Category filter
    if (filters.category) {
      filtered = filtered.filter((p) => p.category.toLowerCase() === filters.category?.toLowerCase());
    }

    // Price range filter
    if (filters.minPrice !== undefined) {
      filtered = filtered.filter((p) => p.price >= filters.minPrice!);
    }
    if (filters.maxPrice !== undefined) {
      filtered = filtered.filter((p) => p.price <= filters.maxPrice!);
    }

    // Color filter
    if (filters.colors && filters.colors.length > 0) {
      filtered = filtered.filter((p) =>
        p.colors.some((c) =>
          filters.colors!.some((fc) => c.toLowerCase() === fc.toLowerCase())
        )
      );
    }

    // Sorting
    if (filters.sortBy === 'price') {
      filtered.sort((a, b) => (filters.sortOrder === 'asc' ? a.price - b.price : b.price - a.price));
    } else if (filters.sortBy === 'name') {
      filtered.sort((a, b) =>
        filters.sortOrder === 'asc' ? a.name.localeCompare(b.name) : b.name.localeCompare(a.name)
      );
    } else if (filters.sortBy === 'newest') {
      filtered.sort((a, b) =>
        filters.sortOrder === 'asc'
          ? new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()
          : new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
      );
    }

    // Pagination
    const total = filtered.length;
    const pageSize = filters.pageSize!;
    const page = filters.page!;
    const totalPages = Math.ceil(total / pageSize);
    const start = (page - 1) * pageSize;
    const items = filtered.slice(start, start + pageSize);

    const response: ApiResponse<PaginatedResponse<Product>> = {
      success: true,
      data: {
        items,
        total,
        page,
        pageSize,
        totalPages,
      },
    };

    res.json(response);
  } catch (error) {
    next(error);
  }
};

/**
 * GET /api/v1/products/:id
 * Получить товар по ID
 */
export const getProductById = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const { id } = req.params;

    const product = mockProducts.find((p) => p.id === id);

    if (!product) {
      res.status(404).json({
        success: false,
        error: 'Товар не найден',
      });
      return;
    }

    const response: ApiResponse<Product> = {
      success: true,
      data: product,
    };

    res.json(response);
  } catch (error) {
    next(error);
  }
};

/**
 * GET /api/v1/products/categories
 * Получить список категорий товаров
 */
export const getCategories = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const categories = Array.from(new Set(mockProducts.map((p) => p.category)));

    const response: ApiResponse<string[]> = {
      success: true,
      data: categories,
    };

    res.json(response);
  } catch (error) {
    next(error);
  }
};

/**
 * GET /api/v1/products/colors/:category
 * Получить список доступных цветов для категории
 */
export const getColorsByCategory = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const { category } = req.params;

    const products = mockProducts.filter(
      (p) => p.category.toLowerCase() === category.toLowerCase()
    );

    const colors = Array.from(
      new Set(products.flatMap((p) => p.colors))
    );

    const response: ApiResponse<string[]> = {
      success: true,
      data: colors,
    };

    res.json(response);
  } catch (error) {
    next(error);
  }
};

/**
 * GET /api/v1/products/price-range
 * Получить диапазон цен для товаров
 */
export const getPriceRange = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const prices = mockProducts.map((p) => p.price);
    const minPrice = Math.min(...prices);
    const maxPrice = Math.max(...prices);

    const response: ApiResponse<{ minPrice: number; maxPrice: number }> = {
      success: true,
      data: { minPrice, maxPrice },
    };

    res.json(response);
  } catch (error) {
    next(error);
  }
};
