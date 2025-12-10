import { Request, Response } from 'express';
import { prisma } from '../config/database';
import { screenService } from '../services/screen.service';
import { printerService } from '../services/printer.service';
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
 * PUT /api/screens/:id/preference
 * Actualizar preferencias de pantalla
 *
 * Lógica de touch/botonera:
 * - Cuando touchEnabled se activa (true), botoneraEnabled se desactiva (false)
 * - Cuando touchEnabled se desactiva (false), botoneraEnabled se activa (true)
 */
export const updatePreference = asyncHandler(
  async (req: AuthenticatedRequest, res: Response) => {
    const { id } = req.params;
    const data = { ...req.body };

    // Lógica automática: touch y botonera son mutuamente excluyentes
    if (typeof data.touchEnabled === 'boolean') {
      // Si se está cambiando touchEnabled, invertir botoneraEnabled
      data.botoneraEnabled = !data.touchEnabled;
    } else if (typeof data.botoneraEnabled === 'boolean') {
      // Si se está cambiando botoneraEnabled, invertir touchEnabled
      data.touchEnabled = !data.botoneraEnabled;
    }

    const preference = await prisma.preference.upsert({
      where: { screenId: id },
      create: {
        screenId: id,
        ...data,
      },
      update: data,
    });

    // Invalidar cache y notificar al frontend
    await screenService.invalidateConfigCache(id);
    await websocketService.broadcastConfigUpdate(id);

    res.json(preference);
  }
);

/**
 * POST /api/screens/:id/standby
 * Poner pantalla en standby
 */
export const setStandby = asyncHandler(
  async (req: AuthenticatedRequest, res: Response) => {
    const { id } = req.params;

    console.log(`[SCREEN] Setting screen ${id} to STANDBY from backoffice`);

    await screenService.updateScreenStatus(id, 'STANDBY');

    // Notificar directamente via WebSocket
    websocketService.broadcastScreenStatus(id, 'STANDBY');

    console.log(`[SCREEN] Screen ${id} set to STANDBY, WebSocket notified`);

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

    console.log(`[SCREEN] Activating screen ${id} from backoffice`);

    await screenService.updateScreenStatus(id, 'ONLINE');

    // Notificar directamente via WebSocket
    websocketService.broadcastScreenStatus(id, 'ONLINE');

    console.log(`[SCREEN] Screen ${id} activated, WebSocket notified`);

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

/**
 * PUT /api/screens/:id/printer
 * Actualizar o crear configuración de impresora
 */
export const updatePrinter = asyncHandler(
  async (req: AuthenticatedRequest, res: Response) => {
    const { id } = req.params;
    const { name, ip, port, enabled } = req.body;

    // Validar datos
    if (!name || !ip || !port) {
      throw new AppError(400, 'Name, IP and port are required');
    }

    const printer = await prisma.printer.upsert({
      where: { screenId: id },
      create: {
        screenId: id,
        name,
        ip,
        port: Number(port),
        enabled: enabled ?? true,
      },
      update: {
        name,
        ip,
        port: Number(port),
        enabled: enabled ?? true,
      },
    });

    // Invalidar cache
    await screenService.invalidateConfigCache(id);

    res.json(printer);
  }
);

/**
 * DELETE /api/screens/:id/printer
 * Eliminar configuración de impresora
 */
export const deletePrinter = asyncHandler(
  async (req: AuthenticatedRequest, res: Response) => {
    const { id } = req.params;

    await prisma.printer.deleteMany({
      where: { screenId: id },
    });

    // Invalidar cache
    await screenService.invalidateConfigCache(id);

    res.json({ message: 'Printer configuration deleted' });
  }
);

/**
 * POST /api/screens/:id/printer/test
 * Probar conexión con impresora
 */
export const testPrinter = asyncHandler(
  async (req: AuthenticatedRequest, res: Response) => {
    const { id } = req.params;

    const printer = await prisma.printer.findUnique({
      where: { screenId: id },
    });

    if (!printer) {
      throw new AppError(404, 'Printer not configured for this screen');
    }

    const success = await printerService.testPrinter(printer.ip, printer.port);

    if (!success) {
      throw new AppError(500, 'Printer connection test failed');
    }

    res.json({ message: 'Printer connection successful', success: true });
  }
);

/**
 * GET /api/screens/by-number/:number
 * Obtener pantalla por número (endpoint público para KDS frontend)
 * Devuelve screenId y apiKey necesarios para conectar
 */
export const getScreenByNumber = asyncHandler(
  async (req: Request, res: Response) => {
    const { number } = req.params;
    const screenNumber = parseInt(number, 10);

    if (isNaN(screenNumber) || screenNumber < 1) {
      throw new AppError(400, 'Invalid screen number');
    }

    const screen = await prisma.screen.findUnique({
      where: { number: screenNumber },
      select: {
        id: true,
        number: true,
        name: true,
        apiKey: true,
        status: true,
        queue: {
          select: {
            id: true,
            name: true,
          },
        },
      },
    });

    if (!screen) {
      throw new AppError(404, `Screen ${screenNumber} not found`);
    }

    res.json({
      screenId: screen.id,
      screenNumber: screen.number,
      screenName: screen.name,
      apiKey: screen.apiKey,
      status: screen.status,
      queue: screen.queue,
    });
  }
);

