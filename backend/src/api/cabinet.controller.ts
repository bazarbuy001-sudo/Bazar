import { Request, Response, NextFunction } from 'express';
import { prisma } from '../server';
import { ApiResponse } from '../types';

/**
 * GET /api/v1/cabinet/profile
 * Получить профиль текущего клиента
 */
export const getProfile = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const clientId = req.headers['x-client-id'] as string;

    if (!clientId) {
      res.status(401).json({
        success: false,
        error: 'Client ID is required',
      });
      return;
    }

    const client = await prisma.client.findUnique({
      where: { id: clientId },
    });

    if (!client) {
      res.status(404).json({
        success: false,
        error: 'Client not found',
      });
      return;
    }

    const response: ApiResponse<any> = {
      success: true,
      data: {
        id: client.id,
        publicId: client.publicId,
        email: client.email,
        name: client.name,
        phone: client.phone,
        city: client.city,
        inn: client.inn,
        isActive: client.isActive,
        createdAt: client.createdAt.toISOString(),
        updatedAt: client.updatedAt.toISOString(),
      },
    };

    res.json(response);
  } catch (error) {
    next(error);
  }
};

/**
 * PUT /api/v1/cabinet/profile
 * Обновить профиль текущего клиента
 */
export const updateProfile = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const clientId = req.headers['x-client-id'] as string;
    const { name, phone, city, inn } = req.body;

    if (!clientId) {
      res.status(401).json({
        success: false,
        error: 'Client ID is required',
      });
      return;
    }

    const client = await prisma.client.findUnique({
      where: { id: clientId },
    });

    if (!client) {
      res.status(404).json({
        success: false,
        error: 'Client not found',
      });
      return;
    }

    const updated = await prisma.client.update({
      where: { id: clientId },
      data: {
        name: name || client.name,
        phone: phone !== undefined ? phone : client.phone,
        city: city !== undefined ? city : client.city,
        inn: inn !== undefined ? inn : client.inn,
        updatedAt: new Date(),
      },
    });

    const response: ApiResponse<any> = {
      success: true,
      data: {
        id: updated.id,
        publicId: updated.publicId,
        email: updated.email,
        name: updated.name,
        phone: updated.phone,
        city: updated.city,
        inn: updated.inn,
        isActive: updated.isActive,
        updatedAt: updated.updatedAt.toISOString(),
      },
      message: 'Profile updated successfully',
    };

    res.json(response);
  } catch (error) {
    next(error);
  }
};

/**
 * GET /api/v1/cabinet/addresses
 * Получить сохранённые адреса доставки
 */
export const getAddresses = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const clientId = req.headers['x-client-id'] as string;

    if (!clientId) {
      res.status(401).json({
        success: false,
        error: 'Client ID is required',
      });
      return;
    }

    // Mock addresses (in production: create separate table for addresses)
    const addresses = [
      {
        id: 'addr-1',
        name: 'Офис',
        street: 'ул. Чуй, 123',
        city: 'Бишкек',
        region: 'Город Бишкек',
        postalCode: '720000',
        country: 'Кыргызстан',
        isDefault: true,
      },
    ];

    const response: ApiResponse<any[]> = {
      success: true,
      data: addresses,
    };

    res.json(response);
  } catch (error) {
    next(error);
  }
};

/**
 * POST /api/v1/cabinet/addresses
 * Добавить новый адрес доставки
 */
export const addAddress = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const clientId = req.headers['x-client-id'] as string;
    const { name, street, city, region, postalCode, country, isDefault } = req.body;

    if (!clientId) {
      res.status(401).json({
        success: false,
        error: 'Client ID is required',
      });
      return;
    }

    if (!name || !street || !city || !country) {
      res.status(400).json({
        success: false,
        error: 'Missing required fields: name, street, city, country',
      });
      return;
    }

    // Mock address creation
    const address = {
      id: `addr-${Date.now()}`,
      name,
      street,
      city,
      region,
      postalCode,
      country,
      isDefault: isDefault || false,
    };

    const response: ApiResponse<any> = {
      success: true,
      data: address,
      message: 'Address added successfully',
    };

    res.json(response);
  } catch (error) {
    next(error);
  }
};

/**
 * DELETE /api/v1/cabinet/addresses/:addressId
 * Удалить адрес доставки
 */
export const deleteAddress = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const { addressId } = req.params;
    const clientId = req.headers['x-client-id'] as string;

    if (!clientId) {
      res.status(401).json({
        success: false,
        error: 'Client ID is required',
      });
      return;
    }

    // Mock deletion
    const response: ApiResponse<null> = {
      success: true,
      message: 'Address deleted successfully',
    };

    res.json(response);
  } catch (error) {
    next(error);
  }
};

/**
 * GET /api/v1/cabinet/preferences
 * Получить предпочтения клиента
 */
export const getPreferences = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const clientId = req.headers['x-client-id'] as string;

    if (!clientId) {
      res.status(401).json({
        success: false,
        error: 'Client ID is required',
      });
      return;
    }

    // Mock preferences
    const preferences = {
      emailNotifications: true,
      smsNotifications: false,
      pushNotifications: true,
      orderUpdates: true,
      promotions: true,
      newProductNotifications: false,
      language: 'ru',
      timezone: 'Asia/Bishkek',
    };

    const response: ApiResponse<typeof preferences> = {
      success: true,
      data: preferences,
    };

    res.json(response);
  } catch (error) {
    next(error);
  }
};

/**
 * PUT /api/v1/cabinet/preferences
 * Обновить предпочтения клиента
 */
export const updatePreferences = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const clientId = req.headers['x-client-id'] as string;

    if (!clientId) {
      res.status(401).json({
        success: false,
        error: 'Client ID is required',
      });
      return;
    }

    const preferences = {
      emailNotifications: req.body.emailNotifications ?? true,
      smsNotifications: req.body.smsNotifications ?? false,
      pushNotifications: req.body.pushNotifications ?? true,
      orderUpdates: req.body.orderUpdates ?? true,
      promotions: req.body.promotions ?? true,
      newProductNotifications: req.body.newProductNotifications ?? false,
      language: req.body.language || 'ru',
      timezone: req.body.timezone || 'Asia/Bishkek',
    };

    const response: ApiResponse<typeof preferences> = {
      success: true,
      data: preferences,
      message: 'Preferences updated successfully',
    };

    res.json(response);
  } catch (error) {
    next(error);
  }
};
