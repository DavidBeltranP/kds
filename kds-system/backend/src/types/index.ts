import { Request } from 'express';
import { z } from 'zod';

// ============================================
// AUTH TYPES
// ============================================

export interface JwtPayload {
  userId: string;
  email: string;
  role: 'ADMIN' | 'OPERATOR' | 'VIEWER';
}

export interface AuthenticatedRequest extends Request {
  user?: JwtPayload;
}

// ============================================
// SCREEN TYPES
// ============================================

export type ScreenStatus = 'ONLINE' | 'OFFLINE' | 'STANDBY';

export interface ScreenWithConfig {
  id: string;
  number: number;
  name: string;
  queueId: string;
  status: ScreenStatus;
  queue: {
    id: string;
    name: string;
    distribution: string;
  };
  appearance: AppearanceConfig | null;
  preference: PreferenceConfig | null;
  keyboard: KeyboardConfig | null;
  printer: PrinterConfig | null;
}

// ============================================
// APPEARANCE TYPES
// ============================================

export interface CardColorConfig {
  id: string;
  color: string;
  minutes: string;
  order: number;
  isFullBackground: boolean;
}

export interface ChannelColorConfig {
  channel: string;
  color: string;
}

export interface AppearanceConfig {
  fontSize: string;
  fontFamily: string;
  columnsPerScreen: number;
  columnSize: string;
  footerHeight: string;
  ordersDisplay: string;
  theme: string;
  screenName: string;
  screenSplit: boolean;
  showCounters: boolean;
  // Colores generales
  backgroundColor: string;
  headerColor: string;
  headerTextColor: string;
  cardColor: string;
  textColor: string;
  accentColor: string;
  // Tipografia de productos
  productFontFamily: string;
  productFontSize: string;
  productFontWeight: string;
  // Tipografia de modificadores
  modifierFontFamily: string;
  modifierFontSize: string;
  modifierFontColor: string;
  modifierFontStyle: string;
  // Cabecera de orden
  headerFontFamily: string;
  headerFontSize: string;
  headerShowChannel: boolean;
  headerShowTime: boolean;
  // Disposicion adicional
  rows: number;
  maxItemsPerColumn: number;
  // Opciones de visualizacion
  showTimer: boolean;
  showOrderNumber: boolean;
  animationEnabled: boolean;
  cardColors: CardColorConfig[];
  channelColors: ChannelColorConfig[];
}

// ============================================
// PREFERENCE TYPES
// ============================================

export interface PreferenceConfig {
  finishOrderActive: boolean;
  finishOrderTime: string;
  showClientData: boolean;
  showName: boolean;
  showIdentifier: boolean;
  identifierMessage: string;
  showNumerator: boolean;
  showPagination: boolean;
  sourceBoxActive: boolean;
  sourceBoxMessage: string;
  touchEnabled: boolean;
  botoneraEnabled: boolean;
}

// ============================================
// KEYBOARD TYPES
// ============================================

export interface KeyboardConfig {
  finishFirstOrder: string;
  finishSecondOrder: string;
  finishThirdOrder: string;
  finishFourthOrder: string;
  finishFifthOrder: string;
  nextPage: string;
  previousPage: string;
  undo: string;
  resetTime: string;
  firstPage: string;
  secondPage: string;
  middlePage: string;
  penultimatePage: string;
  lastPage: string;
  confirmModal: string;
  cancelModal: string;
  power: string;
  exit: string;
  combos: ComboConfig[];
  debounceTime: number;
}

export interface ComboConfig {
  keys: string[];
  holdTime: number;
  action: string;
  enabled: boolean;
}

// ============================================
// PRINTER TYPES
// ============================================

export interface PrinterConfig {
  name: string;
  ip: string;
  port: number;
  enabled: boolean;
}

// ============================================
// ORDER TYPES
// ============================================

export interface OrderItem {
  id: string;
  name: string;
  quantity: number;
  notes?: string;
  modifier?: string;
}

export interface Order {
  id: string;
  externalId: string;
  screenId?: string;
  channel: string;
  channelType?: string; // SALON, LLEVAR, etc.
  customerName?: string;
  identifier: string;
  status: 'PENDING' | 'IN_PROGRESS' | 'FINISHED' | 'CANCELLED';
  createdAt: Date;
  finishedAt?: Date;
  items: OrderItem[];
}

// ============================================
// QUEUE TYPES
// ============================================

export interface QueueChannel {
  channel: string;
  color: string;
  priority: number;
  active: boolean;
}

export interface QueueFilter {
  pattern: string;
  suppress: boolean;
  active: boolean;
}

export interface Queue {
  id: string;
  name: string;
  description?: string;
  distribution: 'DISTRIBUTED' | 'SINGLE';
  active: boolean;
  channels: QueueChannel[];
  filters: QueueFilter[];
}

// ============================================
// MXP TYPES (MAXPOINT)
// ============================================

export interface MxpOrder {
  OrderId: string;
  Channel: string;
  CustomerName: string;
  OrderNumber: string;
  CreatedAt: Date;
}

export interface MxpOrderItem {
  OrderId: string;
  ProductName: string;
  Quantity: number;
  Notes: string;
  Modifier: string;
}

// ============================================
// WEBSOCKET EVENTS
// ============================================

export interface WsScreenRegister {
  screenId: string;
  apiKey: string;
}

export interface WsHeartbeat {
  screenId: string;
  timestamp: number;
}

export interface WsOrdersUpdate {
  orders: Order[];
  totalInQueue: number;
  activeScreensInQueue: number;
}

export interface WsConfigUpdate {
  screenId: string;
  config: ScreenWithConfig;
}

export interface WsScreenStatus {
  screenId: string;
  status: ScreenStatus;
}

export interface WsOrderFinish {
  orderId: string;
  screenId: string;
  timestamp: number;
}

// ============================================
// ZOD SCHEMAS
// ============================================

export const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(6),
});

export const createScreenSchema = z.object({
  name: z.string().min(1).max(50),
  queueId: z.string().cuid(),
});

export const updateScreenSchema = z.object({
  name: z.string().min(1).max(50).optional(),
  queueId: z.string().cuid().optional(),
});

export const createQueueSchema = z.object({
  name: z.string().min(1).max(50),
  description: z.string().optional(),
  distribution: z.enum(['DISTRIBUTED', 'SINGLE']).default('DISTRIBUTED'),
  channels: z.array(z.object({
    channel: z.string(),
    color: z.string().regex(/^#[0-9A-Fa-f]{6}$/),
    priority: z.number().int().min(0).default(0),
  })).optional(),
  filters: z.array(z.object({
    pattern: z.string(),
    suppress: z.boolean().default(false),
  })).optional(),
});

export const updateAppearanceSchema = z.object({
  fontSize: z.string().optional(),
  fontFamily: z.string().optional(),
  columnsPerScreen: z.number().int().min(1).max(10).optional(),
  columnSize: z.string().optional(),
  footerHeight: z.string().optional(),
  ordersDisplay: z.enum(['COLUMNS', 'ROWS']).optional(),
  theme: z.enum(['DARK', 'LIGHT']).optional(),
  screenName: z.string().optional(),
  screenSplit: z.boolean().optional(),
  showCounters: z.boolean().optional(),

  // Colores generales
  backgroundColor: z.string().optional(),
  headerColor: z.string().optional(),
  headerTextColor: z.string().optional(),
  cardColor: z.string().optional(),
  textColor: z.string().optional(),
  accentColor: z.string().optional(),

  // Tipografia de productos
  productFontFamily: z.string().optional(),
  productFontSize: z.string().optional(),
  productFontWeight: z.string().optional(),

  // Tipografia de modificadores
  modifierFontFamily: z.string().optional(),
  modifierFontSize: z.string().optional(),
  modifierFontColor: z.string().optional(),
  modifierFontStyle: z.string().optional(),

  // Cabecera de orden
  headerFontFamily: z.string().optional(),
  headerFontSize: z.string().optional(),
  headerShowChannel: z.boolean().optional(),
  headerShowTime: z.boolean().optional(),

  // Disposicion
  columns: z.number().int().min(1).max(10).optional(),
  rows: z.number().int().min(1).max(10).optional(),
  maxItemsPerColumn: z.number().int().min(1).max(20).optional(),

  // Opciones de visualizacion
  showTimer: z.boolean().optional(),
  showOrderNumber: z.boolean().optional(),
  animationEnabled: z.boolean().optional(),

  cardColors: z.array(z.object({
    color: z.string().regex(/^#[0-9A-Fa-f]{6}$/),
    minutes: z.string().regex(/^\d{2}:\d{2}$/),
    order: z.number().int().min(1).max(10),
    isFullBackground: z.boolean().default(false),
  })).optional(),
  channelColors: z.array(z.object({
    channel: z.string(),
    color: z.string().regex(/^#[0-9A-Fa-f]{6}$/),
  })).optional(),
});

export const updateKeyboardSchema = z.object({
  finishFirstOrder: z.string().max(1).optional(),
  finishSecondOrder: z.string().max(1).optional(),
  finishThirdOrder: z.string().max(1).optional(),
  finishFourthOrder: z.string().max(1).optional(),
  finishFifthOrder: z.string().max(1).optional(),
  nextPage: z.string().max(1).optional(),
  previousPage: z.string().max(1).optional(),
  undo: z.string().max(1).optional(),
  resetTime: z.string().max(1).optional(),
  firstPage: z.string().max(1).optional(),
  secondPage: z.string().max(1).optional(),
  middlePage: z.string().max(1).optional(),
  penultimatePage: z.string().max(1).optional(),
  lastPage: z.string().max(1).optional(),
  confirmModal: z.string().max(1).optional(),
  cancelModal: z.string().max(1).optional(),
  power: z.string().max(1).optional(),
  exit: z.string().max(1).optional(),
  combos: z.array(z.object({
    keys: z.array(z.string().max(1)),
    holdTime: z.number().int().min(500).max(10000),
    action: z.string(),
    enabled: z.boolean().default(true),
  })).optional(),
  debounceTime: z.number().int().min(50).max(500).optional(),
});
