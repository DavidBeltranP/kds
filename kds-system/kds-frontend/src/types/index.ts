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
  name: string;
  ip: string;
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
