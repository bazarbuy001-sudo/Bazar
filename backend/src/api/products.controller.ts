/**
 * Products API Controller v1 (Rewritten for new schema)
 */

import { Request, Response, NextFunction } from 'express';
import { z } from 'zod';
import prisma from '../lib/prisma.js';
import { Product, ProductVariant, Category } from '@prisma/client';

// ============================================
// ZOD VALIDATION SCHEMAS
// ============================================

// Query параметры для списка товаров
const ProductsQuerySchema = z.object({
  page: z.string().optional().transform(v => v ? Math.max(1, parseInt(v) || 1) : 1),
  limit: z.string().optional().transform(v => v ? Math.min(100, Math.max(1, parseInt(v) || 20)) : 20),
  category: z.string().optional(),
  productType: z.enum(['fabric', 'accessory']).optional(),
  isNew: z.enum(['true', 'false']).optional().transform(v => v === 'true' ? true : v === 'false' ? false : undefined),
  isOnSale: z.enum(['true', 'false']).optional().transform(v => v === 'true' ? true : v === 'false' ? false : undefined),
  hasStock: z.enum(['true', 'false']).optional().transform(v => v === 'true' ? true : v === 'false' ? false : undefined),
  minPrice: z.string().optional().transform(v => v ? parseFloat(v) || 0 : undefined),
  maxPrice: z.string().optional().transform(v => v ? parseFloat(v) || 0 : undefined),
  sortBy: z.enum(['price_asc', 'price_desc', 'newest', 'name_asc', 'name_desc']).optional().default('newest'),
  search: z.string().optional(),
});

// Параметры для получения товара по ID
const ProductIdSchema = z.object({
  id: z.string().transform(v => parseInt(v) || 0),
});

// ============================================
// API HANDLERS
// ============================================

/**
 * GET /api/v1/products
 * Получить список товаров с фильтрами и пагинацией
 */
export const getProducts = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    // Валидация query параметров
    const query = ProductsQuerySchema.parse(req.query);

    // Построение WHERE условий
    const where: any = {};

    // Фильтр по категории (по slug или id)
    if (query.category) {
      const categoryId = parseInt(query.category);
      if (!isNaN(categoryId)) {
        // По ID категории
        where.categories = {
          some: {
            categoryId: categoryId,
          },
        };
      } else {
        // По slug категории
        where.categories = {
          some: {
            category: {
              slug: query.category,
            },
          },
        };
      }
    }

    // Фильтр по типу товара
    if (query.productType) {
      where.productType = query.productType;
    }

    // Фильтр по новинкам
    if (query.isNew !== undefined) {
      where.isNew = query.isNew;
    }

    // Фильтр по скидкам
    if (query.isOnSale !== undefined) {
      where.isOnSale = query.isOnSale;
    }

    // Фильтр по наличию
    if (query.hasStock !== undefined) {
      if (query.hasStock) {
        where.stockQuantity = { gt: 0 };
      } else {
        where.stockQuantity = { lte: 0 };
      }
    }

    // Фильтр по цене
    if (query.minPrice !== undefined || query.maxPrice !== undefined) {
      where.price = {};
      if (query.minPrice !== undefined) {
        where.price.gte = query.minPrice;
      }
      if (query.maxPrice !== undefined) {
        where.price.lte = query.maxPrice;
      }
    }

    // Поиск по названию
    if (query.search) {
      where.name = {
        contains: query.search,
        mode: 'insensitive',
      };
    }

    // Только активные товары (поле hasStock используется для проверки активности)
    // where.isActive = true; // Поле не существует в схеме

    // Сортировка
    let orderBy: any = {};
    switch (query.sortBy) {
      case 'price_asc':
        orderBy.price = 'asc';
        break;
      case 'price_desc':
        orderBy.price = 'desc';
        break;
      case 'newest':
        orderBy.createdAt = 'desc';
        break;
      case 'name_asc':
        orderBy.name = 'asc';
        break;
      case 'name_desc':
        orderBy.name = 'desc';
        break;
      default:
        orderBy.createdAt = 'desc';
    }

    // Пагинация
    const skip = (query.page - 1) * query.limit;

    // Запрос к базе
    const [products, totalCount] = await Promise.all([
      prisma.product.findMany({
        where,
        orderBy,
        skip,
        take: query.limit,
        include: {
          variants: {
            where: { isActive: true },
          },
          categories: {
            include: {
              category: {
                select: { id: true, name: true, slug: true },
              },
            },
          },
        },
      }),
      prisma.product.count({ where }),
    ]);

    // Форматирование результата
    const formattedProducts = products.map((product: any) => ({
      id: product.id,
      name: product.name,
      slug: product.slug,
      price: Number(product.price),
      isNew: product.isNew,
      isOnSale: product.isOnSale,
      isRestRoll: product.isRestRoll,
      productType: product.productType,
      unit: product.unit,
      rollLength: product.rollLength ? Number(product.rollLength) : null,
      minOrderQty: Number(product.minOrderQty),
      stockQuantity: product.stockQuantity ? Number(product.stockQuantity) : null,
      hasStock: product.hasStock,
      description: product.description,
      mainImage: product.mainImage,
      images: product.images ? (Array.isArray(product.images) ? product.images : [product.images]) : [],
      variants: product.variants.map((variant: any) => ({
        id: variant.id,
        colorName: variant.colorName,
        colorHex: variant.colorHex,
        sku: variant.sku,
        inStock: variant.inStock,
        images: variant.images ? (Array.isArray(variant.images) ? variant.images : [variant.images]) : [],
      })),
      categories: product.categories.map((cp: any) => cp.category),
      createdAt: product.createdAt.toISOString(),
    }));

    // Мета-информация для пагинации
    const totalPages = Math.ceil(totalCount / query.limit);

    const response = {
      status: 'success',
      data: {
        products: formattedProducts,
        pagination: {
          currentPage: query.page,
          totalPages,
          totalCount,
          limit: query.limit,
          hasNextPage: query.page < totalPages,
          hasPrevPage: query.page > 1,
        },
        filters: {
          category: query.category,
          productType: query.productType,
          isNew: query.isNew,
          isOnSale: query.isOnSale,
          hasStock: query.hasStock,
          priceRange: query.minPrice || query.maxPrice ? {
            min: query.minPrice,
            max: query.maxPrice,
          } : null,
          search: query.search,
          sortBy: query.sortBy,
        },
      },
    };

    res.json(response);
  } catch (error) {
    if (error instanceof z.ZodError) {
      res.status(400).json({
        status: 'error',
        message: 'Invalid query parameters',
        errors: error.issues,
      });
      return;
    }
    next(error);
  }
};

/**
 * GET /api/v1/products/:id
 * Получить карточку товара с вариантами
 */
export const getProduct = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    // Валидация ID
    const { id } = ProductIdSchema.parse(req.params);

    if (id === 0) {
      res.status(400).json({
        status: 'error',
        message: 'Invalid product ID',
      });
      return;
    }

    // Запрос товара
    const product = await prisma.product.findFirst({
      where: {
        id: id,
      },
      include: {
        variants: {
          where: { isActive: true },
        },
        categories: {
          include: {
            category: {
              select: { id: true, name: true, slug: true, parentId: true },
            },
          },
        },
      },
    });

    if (!product) {
      res.status(404).json({
        status: 'error',
        message: 'Product not found',
      });
      return;
    }

    // Форматирование результата
    const formattedProduct = {
      id: product.id,
      name: product.name,
      slug: product.slug,
      price: Number(product.price),
      isNew: product.isNew,
      isOnSale: product.isOnSale,
      isRestRoll: product.isRestRoll,
      productType: product.productType,
      unit: product.unit,
      rollLength: product.rollLength ? Number(product.rollLength) : null,
      minOrderQty: Number(product.minOrderQty),
      stepQty: Number(product.stepQty),
      stockQuantity: product.stockQuantity ? Number(product.stockQuantity) : null,
      hasStock: product.hasStock,
      description: product.description,
      mainImage: product.mainImage,
      images: product.images ? (Array.isArray(product.images) ? product.images : [product.images]) : [],
      variants: product.variants.map((variant: any) => ({
        id: variant.id,
        colorName: variant.colorName,
        colorHex: variant.colorHex,
        sku: variant.sku,
        inStock: variant.inStock,
        images: variant.images ? (Array.isArray(variant.images) ? variant.images : [variant.images]) : [],
      })),
      categories: product.categories.map((cp: any) => cp.category),
      createdAt: product.createdAt.toISOString(),
      updatedAt: product.updatedAt.toISOString(),
    };

    const response = {
      status: 'success',
      data: formattedProduct,
    };

    res.json(response);
  } catch (error) {
    if (error instanceof z.ZodError) {
      res.status(400).json({
        status: 'error',
        message: 'Invalid product ID',
        errors: error.issues,
      });
      return;
    }
    next(error);
  }
};

/**
 * GET /api/v1/categories
 * Получить дерево категорий
 */
export const getCategories = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    // Получаем все категории
    const categories = await prisma.category.findMany({
      where: { isActive: true },
      orderBy: [{ level: 'asc' }, { position: 'asc' }],
      include: {
        _count: {
          select: {
            products: true,
          },
        },
      },
    });

    // Строим дерево категорий
    const buildTree = (parentId: number | null = null): any[] => {
      return categories
        .filter((cat: any) => cat.parentId === parentId)
        .map((cat: any) => ({
          id: cat.id,
          name: cat.name,
          slug: cat.slug,
          level: cat.level,
          position: cat.position,
          icon: cat.icon,
          productCount: cat._count.products,
          children: buildTree(cat.id),
        }));
    };

    const tree = buildTree();

    const response = {
      status: 'success',
      data: {
        categories: tree,
        totalCount: categories.length,
      },
    };

    res.json(response);
  } catch (error) {
    next(error);
  }
};