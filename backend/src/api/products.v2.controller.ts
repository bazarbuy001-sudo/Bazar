/**
 * Products Controller v2
 * Работает с новой структурой БД (Product, FabricComposition, ProductImage)
 */

import { Request, Response } from 'express';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

/**
 * POST /api/v2/admin/products
 * Создать товар (Ткань или Фурнитура)
 */
export const createProduct = async (req: Request, res: Response): Promise<void> => {
  try {
    const {
      product_name,
      article_number,
      product_type, // "fabric" или "accessory"
      category, // ID основной категории
      subcategory, // ID подкатегории
      price,
      old_price,
      is_on_sale,
      is_new,
      is_rest_roll,
      warehouse_availability,
      // Ткани
      color,
      shade,
      width_cm,
      composition, // Array of {material, percentage}
      density_gsm,
      density_gpm,
      pattern,
      print_type,
      fabric_subtype,
      fabric_properties,
      purpose,
      meters_per_roll,
      meters_per_kg,
      minimum_cut,
      country_of_origin,
      // Фурнитура
      material,
      accessory_type,
      size,
      application,
      finish,
      brand,
      package_type,
      mounting_type,
      colors,
    } = req.body;

    // Валидация обязательных полей
    if (!product_name || !product_type || !category || !subcategory || !price) {
      res.status(400).json({
        success: false,
        error: 'Missing required fields: product_name, product_type, category, subcategory, price'
      });
      return;
    }

    // Валидация: Ткани ДОЛЖНЫ иметь composition
    if (product_type === 'FABRIC' && (!composition || composition.length === 0)) {
      res.status(400).json({
        success: false,
        error: 'Fabric products must have composition data'
      });
      return;
    }

    // Валидация: Фурнитура НЕ может иметь composition
    if (product_type === 'ACCESSORY' && composition && composition.length > 0) {
      res.status(400).json({
        success: false,
        error: 'Accessory products cannot have composition'
      });
      return;
    }

    // Валидация: Ткани ДОЛЖНЫ иметь minimum_cut (3, 6 или 10)
    if (product_type === 'FABRIC' && ![3, 6, 10].includes(Number(minimum_cut))) {
      res.status(400).json({
        success: false,
        error: 'Fabric minimum_cut must be 3, 6, or 10 meters'
      });
      return;
    }

    // Валидация: Состав не может быть >100%
    if (composition && composition.length > 0) {
      const totalPercent = composition.reduce((sum: number, c: any) => sum + c.percentage, 0);
      if (totalPercent > 100) {
        res.status(400).json({
          success: false,
          error: 'Composition total percentage cannot exceed 100%'
        });
        return;
      }
    }

    // Создать товар
    const product = await prisma.product.create({
      data: {
        publicId: `${product_type.toUpperCase()}-${Date.now()}`,
        name: product_name,
        articleNumber: article_number,
        productType: product_type.toUpperCase(),
        categoryId: category,
        subcategoryId: subcategory,
        price: Number(price),
        oldPrice: old_price ? Number(old_price) : null,
        isOnSale: is_on_sale || false,
        isNew: is_new || false,
        isRestRoll: is_rest_roll || false,
        warehouseAvailability: warehouse_availability ? Number(warehouse_availability) : 0,
        // Ткани поля
        color: color || null,
        shade: shade || null,
        widthCm: width_cm ? Number(width_cm) : null,
        densityGsm: density_gsm ? Number(density_gsm) : null,
        densityGpm: density_gpm ? Number(density_gpm) : null,
        pattern: pattern || null,
        printType: print_type || null,
        fabricSubtype: fabric_subtype || null,
        fabricProperties: fabric_properties || null,
        purpose: purpose || null,
        metersPerRoll: meters_per_roll ? Number(meters_per_roll) : null,
        metersPerKg: meters_per_kg ? Number(meters_per_kg) : null,
        minimumCut: minimum_cut ? Number(minimum_cut) : null,
        countryOfOrigin: country_of_origin || null,
        // Фурнитура поля
        material: material || null,
        accessoryType: accessory_type || null,
        size: size || null,
        application: application || null,
        finish: finish || null,
        brand: brand || null,
        packageType: package_type || null,
        mountingType: mounting_type || null,
        // Цвета
        colors: colors ? JSON.parse(JSON.stringify(colors)) : []
      }
    });

    // Добавить компоненты состава (если есть)
    if (composition && composition.length > 0) {
      await prisma.fabricComposition.createMany({
        data: composition.map((comp: any) => ({
          productId: product.id,
          material: comp.material,
          percentage: comp.percentage
        }))
      });
    }

    res.status(201).json({
      success: true,
      message: 'Product created successfully',
      data: {
        id: product.id,
        publicId: product.publicId
      }
    });
  } catch (error: any) {
    console.error('Create product error:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Failed to create product'
    });
  }
};

/**
 * GET /api/v2/admin/products
 * Получить все товары (с фильтрацией)
 */
export const getAllProducts = async (req: Request, res: Response): Promise<void> => {
  try {
    const { product_type, category, is_on_sale, is_new, page = 1, limit = 20 } = req.query;

    const where: any = {};
    if (product_type) where.productType = product_type.toString().toUpperCase();
    if (category) where.categoryId = category;
    if (is_on_sale === 'true') where.isOnSale = true;
    if (is_new === 'true') where.isNew = true;

    const products = await prisma.product.findMany({
      where,
      include: {
        category: true,
        subcategory: true,
        compositions: true,
        images: true
      },
      skip: (Number(page) - 1) * Number(limit),
      take: Number(limit),
      orderBy: { createdAt: 'desc' }
    });

    const total = await prisma.product.count({ where });

    res.status(200).json({
      success: true,
      data: products,
      pagination: {
        total,
        page: Number(page),
        limit: Number(limit),
        pages: Math.ceil(total / Number(limit))
      }
    });
  } catch (error: any) {
    res.status(500).json({
      success: false,
      error: error.message || 'Failed to fetch products'
    });
  }
};

/**
 * GET /api/v2/admin/products/:id
 * Получить товар по ID
 */
export const getProduct = async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params;

    const product = await prisma.product.findUnique({
      where: { id },
      include: {
        category: true,
        subcategory: true,
        compositions: true,
        images: true
      }
    });

    if (!product) {
      res.status(404).json({
        success: false,
        error: 'Product not found'
      });
      return;
    }

    res.status(200).json({
      success: true,
      data: product
    });
  } catch (error: any) {
    res.status(500).json({
      success: false,
      error: error.message || 'Failed to fetch product'
    });
  }
};

/**
 * PUT /api/v2/admin/products/:id
 * Обновить товар
 */
export const updateProduct = async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    const { composition, ...updateData } = req.body;

    // Обновить товар
    const product = await prisma.product.update({
      where: { id },
      data: updateData
    });

    // Обновить состав (если есть)
    if (composition && Array.isArray(composition)) {
      // Удалить старый состав
      await prisma.fabricComposition.deleteMany({
        where: { productId: id }
      });

      // Добавить новый
      if (composition.length > 0) {
        await prisma.fabricComposition.createMany({
          data: composition.map((comp: any) => ({
            productId: id,
            material: comp.material,
            percentage: comp.percentage
          }))
        });
      }
    }

    res.status(200).json({
      success: true,
      message: 'Product updated successfully',
      data: product
    });
  } catch (error: any) {
    res.status(500).json({
      success: false,
      error: error.message || 'Failed to update product'
    });
  }
};

/**
 * DELETE /api/v2/admin/products/:id
 * Удалить товар
 */
export const deleteProduct = async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params;

    await prisma.product.delete({
      where: { id }
    });

    res.status(200).json({
      success: true,
      message: 'Product deleted successfully'
    });
  } catch (error: any) {
    res.status(500).json({
      success: false,
      error: error.message || 'Failed to delete product'
    });
  }
};

/**
 * GET /api/v2/admin/categories
 * Получить все категории с подкатегориями
 */
export const getCategories = async (req: Request, res: Response): Promise<void> => {
  try {
    const { type } = req.query;

    const where = type ? { type: type.toString() } : {};

    const categories = await prisma.category.findMany({
      where,
      include: {
        subcategories: true
      }
    });

    res.status(200).json({
      success: true,
      data: categories
    });
  } catch (error: any) {
    res.status(500).json({
      success: false,
      error: error.message || 'Failed to fetch categories'
    });
  }
};
