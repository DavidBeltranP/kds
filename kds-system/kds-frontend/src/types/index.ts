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
  createdAt: string;
  finishedAt?: string;
  items: OrderItem[];
}

// ============================================
// SCREEN TYPES
// ============================================

export type ScreenStatus = 'ONLINE' | 'OFFLINE' | 'STANDBY';

export interface ScreenConfig {
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
}

// ============================================
// APPEARANCE TYPES
// ============================================

export interface CardColor {
  id: string;
  color: string;
  minutes: string;
  order: number;
  isFullBackground: boolean;
}

export interface ChannelColor {
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

  // ============================================
  // TIPOGRAFÍA HEADER (Orden #xxx)
  // ============================================
  headerFontFamily: string;
  headerFontSize: string;
  headerFontWeight?: string;
  headerFontStyle?: string;
  headerBgColor?: string;
  headerTextColorCustom?: string;
  showHeader?: boolean;

  // ============================================
  // TIPOGRAFÍA TIMER (00:00)
  // ============================================
  timerFontFamily?: string;
  timerFontSize?: string;
  timerFontWeight?: string;
  timerFontStyle?: string;
  timerTextColor?: string;
  showTimer: boolean;

  // ============================================
  // TIPOGRAFÍA CLIENTE (nombre)
  // ============================================
  clientFontFamily?: string;
  clientFontSize?: string;
  clientFontWeight?: string;
  clientFontStyle?: string;
  clientTextColor?: string;
  clientBgColor?: string;
  showClient?: boolean;

  // ============================================
  // TIPOGRAFÍA CANTIDAD (5x)
  // ============================================
  quantityFontFamily?: string;
  quantityFontSize?: string;
  quantityFontWeight?: string;
  quantityFontStyle?: string;
  quantityTextColor?: string;
  showQuantity?: boolean;

  // ============================================
  // TIPOGRAFÍA PRODUCTOS (nombre del producto)
  // ============================================
  productFontFamily: string;
  productFontSize: string;
  productFontWeight: string;
  productFontStyle?: string;
  productTextColor?: string;
  productBgColor?: string;
  productUppercase?: boolean;

  // ============================================
  // TIPOGRAFÍA SUBPRODUCTOS/SUBITEMS (1x Pepsi, 1x Crispy)
  // ============================================
  subitemFontFamily?: string;
  subitemFontSize?: string;
  subitemFontWeight?: string;
  subitemFontStyle?: string;
  subitemTextColor?: string;
  subitemBgColor?: string;
  subitemIndent?: number;
  showSubitems?: boolean;

  // ============================================
  // TIPOGRAFÍA MODIFICADORES/NOTAS (*10x PRESAS, etc)
  // ============================================
  modifierFontFamily: string;
  modifierFontSize: string;
  modifierFontWeight?: string;
  modifierFontStyle: string;
  modifierFontColor: string;
  modifierBgColor?: string;
  modifierIndent?: number;
  showModifiers?: boolean;

  // ============================================
  // TIPOGRAFÍA NOTAS ESPECIALES (* nota)
  // ============================================
  notesFontFamily?: string;
  notesFontSize?: string;
  notesFontWeight?: string;
  notesFontStyle?: string;
  notesTextColor?: string;
  notesBgColor?: string;
  notesIndent?: number;
  showNotes?: boolean;

  // ============================================
  // TIPOGRAFÍA CANAL/FOOTER (KIOSKO-EFECTIVO)
  // ============================================
  channelFontFamily?: string;
  channelFontSize?: string;
  channelFontWeight?: string;
  channelFontStyle?: string;
  channelTextColor?: string;
  channelUppercase?: boolean;
  showChannel?: boolean;

  // Legacy fields
  headerShowChannel: boolean;
  headerShowTime: boolean;

  // Disposicion adicional
  rows: number;
  maxItemsPerColumn: number;

  // Opciones de visualizacion
  showOrderNumber: boolean;
  animationEnabled: boolean;
  cardColors: CardColor[];
  channelColors: ChannelColor[];
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
  // Touch/Tactil
  touchEnabled: boolean;
}

// ============================================
// KEYBOARD TYPES
// ============================================

export interface ComboConfig {
  keys: string[];
  holdTime: number;
  action: string;
  enabled: boolean;
}

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

// ============================================
// WEBSOCKET EVENTS
// ============================================

export interface WsOrdersUpdate {
  orders: Order[];
  newOrders?: number;
}

export interface WsConfigUpdate {
  config: ScreenConfig;
}
