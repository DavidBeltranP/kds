import { Request, Response } from 'express';
import { prisma } from '../config/database';
import { screenService } from '../services/screen.service';
import {
  createScreenSchema,
  updateScreenSchema,
  updateAppearanceSchema,
  updateKeyboardSchema,
  AuthenticatedRequest,
} from '../types';
import { asyncHandler, AppError } from '../middlewares/error.middleware';
import { websocketService } from '../services/websocket.service';

/**
 * GET /api/screens
 * Obtener todas las pantallas
 */
export const getAllScreens = asyncHandler(
  async (_req: Request, res: Response) => {
    const screens = await screenService.getAllScreensWithStatus();
    res.json(screens);
  }
);

/**
 * GET /api/screens/:id
 * Obtener una pantalla por ID
 */
export const getScreen = asyncHandler(async (req: Request, res: Response) => {
  const { id } = req.params;
  const screen = await screenService.getScreenConfig(id);

  if (!screen) {
    throw new AppError(404, 'Screen not found');
  }

  res.json(screen);
});

/**
 * POST /api/screens
 * Crear nueva pantalla
 */
export const createScreen = asyncHandler(
  async (req: AuthenticatedRequest, res: Response) => {
    const data = createScreenSchema.parse(req.body);

    const screen = await prisma.screen.create({
      data: {
        name: data.name,
        ip: data.ip,
        queueId: data.queueId,
        // Crear configuraciones por defecto
        appearance: {
          create: {
            cardColors: {
              create: [
                { color: '#98c530', minutes: '01:00', order: 1 },
                { color: '#fddf58', minutes: '02:00', order: 2 },
                { color: '#e75646', minutes: '03:00', order: 3 },
                { color: '#e75646', minutes: '04:00', order: 4 },
              ],
            },
          },
        },
        preference: { create: {} },
        keyboard: { create: {} },
      },
      include: {
        queue: true,
      },
    });

    res.status(201).json(screen);
  }
);

/**
 * PUT /api/screens/:id
 * Actualizar pantalla
 */
export const updateScreen = asyncHandler(
  async (req: AuthenticatedRequest, res: Response) => {
    const { id } = req.params;
    const data = updateScreenSchema.parse(req.body);

    const screen = await prisma.screen.update({
      where: { id },
      data,
      include: {
        queue: true,
      },
    });

    // Invalidar cache
    await screenService.invalidateConfigCache(id);

    res.json(screen);
  }
);

/**
 * DELETE /api/screens/:id
 * Eliminar pantalla
 */
export const deleteScreen = asyncHandler(
  async (req: AuthenticatedRequest, res: Response) => {
    const { id } = req.params;

    await prisma.screen.delete({
      where: { id },
    });

    res.status(204).send();
  }
);

/**
 * GET /api/screens/:id/config
 * Obtener configuración completa de pantalla
 */
export const getScreenConfig = asyncHandler(
  async (req: Request, res: Response) => {
    const { id } = req.params;
    const config = await screenService.getScreenConfig(id);

    if (!config) {
      throw new AppError(404, 'Screen not found');
    }

    res.json(config);
  }
);

/**
 * PUT /api/screens/:id/appearance
 * Actualizar apariencia de pantalla
 */
export const updateAppearance = asyncHandler(
  async (req: AuthenticatedRequest, res: Response) => {
    const { id } = req.params;
    const data = updateAppearanceSchema.parse(req.body);

    // Verificar que existe la pantalla
    const screen = await prisma.screen.findUnique({
      where: { id },
      include: { appearance: true },
    });

    if (!screen) {
      throw new AppError(404, 'Screen not found');
    }

    // Actualizar o crear appearance
    const appearance = await prisma.appearance.upsert({
      where: { screenId: id },
      create: {
        screenId: id,
        fontSize: data.fontSize,
        fontFamily: data.fontFamily,
        columnsPerScreen: data.columns || data.columnsPerScreen,
        columnSize: data.columnSize,
        footerHeight: data.footerHeight,
        ordersDisplay: data.ordersDisplay,
        theme: data.theme,
        screenName: data.screenName,
        screenSplit: data.screenSplit,
        showCounters: data.showCounters,
        backgroundColor: data.backgroundColor,
        headerColor: data.headerColor,
        headerTextColor: data.headerTextColor,
        cardColor: data.cardColor,
        textColor: data.textColor,
        accentColor: data.accentColor,
        productFontFamily: data.productFontFamily,
        productFontSize: data.productFontSize,
        productFontWeight: data.productFontWeight,
        modifierFontFamily: data.modifierFontFamily,
        modifierFontSize: data.modifierFontSize,
        modifierFontColor: data.modifierFontColor,
        modifierFontStyle: data.modifierFontStyle,
        headerFontFamily: data.headerFontFamily,
        headerFontSize: data.headerFontSize,
        headerShowChannel: data.headerShowChannel,
        headerShowTime: data.headerShowTime,
        rows: data.rows,
        maxItemsPerColumn: data.maxItemsPerColumn,
        showTimer: data.showTimer,
        showOrderNumber: data.showOrderNumber,
        animationEnabled: data.animationEnabled,
        cardColors: data.cardColors
          ? {
              create: data.cardColors,
            }
          : undefined,
        channelColors: data.channelColors
          ? {
              create: data.channelColors,
            }
          : undefined,
      },
      update: {
        fontSize: data.fontSize,
        fontFamily: data.fontFamily,
        columnsPerScreen: data.columns || data.columnsPerScreen,
        columnSize: data.columnSize,
        footerHeight: data.footerHeight,
        ordersDisplay: data.ordersDisplay,
        theme: data.theme,
        screenName: data.screenName,
        screenSplit: data.screenSplit,
        showCounters: data.showCounters,
        backgroundColor: data.backgroundColor,
        headerColor: data.headerColor,
        headerTextColor: data.headerTextColor,
        cardColor: data.cardColor,
        textColor: data.textColor,
        accentColor: data.accentColor,
        productFontFamily: data.productFontFamily,
        productFontSize: data.productFontSize,
        productFontWeight: data.productFontWeight,
        modifierFontFamily: data.modifierFontFamily,
        modifierFontSize: data.modifierFontSize,
        modifierFontColor: data.modifierFontColor,
        modifierFontStyle: data.modifierFontStyle,
        headerFontFamily: data.headerFontFamily,
        headerFontSize: data.headerFontSize,
        headerShowChannel: data.headerShowChannel,
        headerShowTime: data.headerShowTime,
        rows: data.rows,
        maxItemsPerColumn: data.maxItemsPerColumn,
        showTimer: data.showTimer,
        showOrderNumber: data.showOrderNumber,
        animationEnabled: data.animationEnabled,
      },
    });

    // Actualizar cardColors si se proporcionan
    if (data.cardColors) {
      // Eliminar existentes
      await prisma.cardColor.deleteMany({
        where: { appearanceId: appearance.id },
      });
      // Crear nuevos
      await prisma.cardColor.createMany({
        data: data.cardColors.map((c) => ({
          appearanceId: appearance.id,
          ...c,
        })),
      });
    }

    // Actualizar channelColors si se proporcionan
    if (data.channelColors) {
      // Eliminar existentes
      await prisma.channelColor.deleteMany({
        where: { appearanceId: appearance.id },
      });
      // Crear nuevos
      await prisma.channelColor.createMany({
        data: data.channelColors.map((c) => ({
          appearanceId: appearance.id,
          ...c,
        })),
      });
    }

    // Invalidar cache y notificar al frontend
    await screenService.invalidateConfigCache(id);

    // Broadcast directo al WebSocket (bypass Redis PubSub)
    await websocketService.broadcastConfigUpdate(id);

    res.json({ message: 'Appearance updated' });
  }
);

/**
 * PUT /api/screens/:id/keyboard
 * Actualizar configuración de teclado/botonera
 */
export const updateKeyboard = asyncHandler(
  async (req: AuthenticatedRequest, res: Response) => {
    const { id } = req.params;
    const data = updateKeyboardSchema.parse(req.body);

    const keyboard = await prisma.keyboardConfig.upsert({
      where: { screenId: id },
      create: {
        screenId: id,
        ...data,
        combos: data.combos ? JSON.stringify(data.combos) : '[]',
      },
      update: {
        ...data,
        combos: data.combos ? JSON.stringify(data.combos) : undefined,
      },
    });

    // Invalidar cache
    await screenService.invalidateConfigCache(id);

    res.json(keyboard);
  }
);

/**
 * POST /api/screens/:id/standby
 * Poner pantalla en standby
 */
export const setStandby = asyncHandler(
  async (req: AuthenticatedRequest, res: Response) => {
    const { id } = req.params;

    await screenService.updateScreenStatus(id, 'STANDBY');

    res.json({ message: 'Screen set to standby', status: 'STANDBY' });
  }
);

/**
 * POST /api/screens/:id/activate
 * Activar pantalla
 */
export const activateScreen = asyncHandler(
  async (req: AuthenticatedRequest, res: Response) => {
    const { id } = req.params;

    await screenService.updateScreenStatus(id, 'ONLINE');

    res.json({ message: 'Screen activated', status: 'ONLINE' });
  }
);

/**
 * POST /api/screens/:id/regenerate-key
 * Regenerar API key de pantalla
 */
export const regenerateApiKey = asyncHandler(
  async (req: AuthenticatedRequest, res: Response) => {
    const { id } = req.params;

    const screen = await prisma.screen.update({
      where: { id },
      data: {
        apiKey: `${id}-${Date.now()}-${Math.random().toString(36).slice(2)}`,
      },
      select: { apiKey: true },
    });

    res.json({ apiKey: screen.apiKey });
  }
);
