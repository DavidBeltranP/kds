import { Router } from 'express';
import { authenticate, authorize } from '../middlewares/auth.middleware';

// Controllers
import * as authController from '../controllers/auth.controller';
import * as userController from '../controllers/user.controller';
import * as screenController from '../controllers/screen.controller';
import * as queueController from '../controllers/queue.controller';
import * as orderController from '../controllers/order.controller';
import * as configController from '../controllers/config.controller';
import * as mirrorController from '../controllers/mirror.controller';

const router = Router();

// ============================================
// AUTH ROUTES
// ============================================
router.post('/auth/login', authController.login);
router.post('/auth/refresh', authController.refresh);
router.get('/auth/me', authenticate, authController.me);
router.post(
  '/auth/change-password',
  authenticate,
  authController.changePassword
);

// ============================================
// USER ROUTES
// ============================================
router.get('/users', authenticate, authorize('ADMIN'), userController.getAllUsers);
router.get('/users/:id', authenticate, authorize('ADMIN'), userController.getUser);
router.post('/users', authenticate, authorize('ADMIN'), userController.createUser);
router.put('/users/:id', authenticate, authorize('ADMIN'), userController.updateUser);
router.delete('/users/:id', authenticate, authorize('ADMIN'), userController.deleteUser);
router.post(
  '/users/:id/toggle-active',
  authenticate,
  authorize('ADMIN'),
  userController.toggleUserActive
);

// ============================================
// SCREEN ROUTES
// ============================================
router.get('/screens', authenticate, screenController.getAllScreens);
router.get('/screens/:id', authenticate, screenController.getScreen);
router.post(
  '/screens',
  authenticate,
  authorize('ADMIN'),
  screenController.createScreen
);
router.put(
  '/screens/:id',
  authenticate,
  authorize('ADMIN', 'OPERATOR'),
  screenController.updateScreen
);
router.delete(
  '/screens/:id',
  authenticate,
  authorize('ADMIN'),
  screenController.deleteScreen
);

// Screen configuration
router.get('/screens/:id/config', screenController.getScreenConfig);
router.put(
  '/screens/:id/appearance',
  authenticate,
  authorize('ADMIN', 'OPERATOR'),
  screenController.updateAppearance
);
router.put(
  '/screens/:id/keyboard',
  authenticate,
  authorize('ADMIN', 'OPERATOR'),
  screenController.updateKeyboard
);
router.put(
  '/screens/:id/preference',
  authenticate,
  authorize('ADMIN', 'OPERATOR'),
  screenController.updatePreference
);

// Printer configuration
router.put(
  '/screens/:id/printer',
  authenticate,
  authorize('ADMIN', 'OPERATOR'),
  screenController.updatePrinter
);
router.delete(
  '/screens/:id/printer',
  authenticate,
  authorize('ADMIN'),
  screenController.deletePrinter
);
router.post(
  '/screens/:id/printer/test',
  authenticate,
  authorize('ADMIN', 'OPERATOR'),
  screenController.testPrinter
);

// Screen by number (public endpoint for KDS frontend)
router.get('/screens/by-number/:number', screenController.getScreenByNumber);

// Screen status
router.post(
  '/screens/:id/standby',
  authenticate,
  authorize('ADMIN', 'OPERATOR'),
  screenController.setStandby
);
router.post(
  '/screens/:id/activate',
  authenticate,
  authorize('ADMIN', 'OPERATOR'),
  screenController.activateScreen
);
router.post(
  '/screens/:id/regenerate-key',
  authenticate,
  authorize('ADMIN'),
  screenController.regenerateApiKey
);

// ============================================
// QUEUE ROUTES
// ============================================
router.get('/queues', authenticate, queueController.getAllQueues);
router.get('/queues/:id', authenticate, queueController.getQueue);
router.post(
  '/queues',
  authenticate,
  authorize('ADMIN'),
  queueController.createQueue
);
router.put(
  '/queues/:id',
  authenticate,
  authorize('ADMIN'),
  queueController.updateQueue
);
router.delete(
  '/queues/:id',
  authenticate,
  authorize('ADMIN'),
  queueController.deleteQueue
);

// Queue channels
router.post(
  '/queues/:id/channels',
  authenticate,
  authorize('ADMIN'),
  queueController.addChannel
);
router.put(
  '/queues/:id/channels/:channelId',
  authenticate,
  authorize('ADMIN'),
  queueController.updateChannel
);
router.delete(
  '/queues/:id/channels/:channelId',
  authenticate,
  authorize('ADMIN'),
  queueController.deleteChannel
);

// Queue filters
router.post(
  '/queues/:id/filters',
  authenticate,
  authorize('ADMIN'),
  queueController.addFilter
);
router.delete(
  '/queues/:id/filters/:filterId',
  authenticate,
  authorize('ADMIN'),
  queueController.deleteFilter
);

// Queue stats
router.get('/queues/:id/stats', authenticate, queueController.getQueueStats);
router.post(
  '/queues/:id/reset-balance',
  authenticate,
  authorize('ADMIN'),
  queueController.resetBalance
);

// ============================================
// ORDER ROUTES
// ============================================
router.get('/orders', authenticate, orderController.getAllOrders);
router.get('/orders/stats', authenticate, orderController.getOrderStats);
router.get('/orders/dashboard-stats', authenticate, orderController.getDashboardStats);
router.get('/orders/:id', authenticate, orderController.getOrder);
router.get(
  '/orders/screen/:screenId',
  authenticate,
  orderController.getOrdersByScreen
);
router.get(
  '/orders/recently-finished/:screenId',
  authenticate,
  orderController.getRecentlyFinished
);

router.post(
  '/orders/:id/finish',
  authenticate,
  authorize('ADMIN', 'OPERATOR'),
  orderController.finishOrder
);
router.post(
  '/orders/:id/undo',
  authenticate,
  authorize('ADMIN', 'OPERATOR'),
  orderController.undoFinishOrder
);
router.post(
  '/orders/:id/cancel',
  authenticate,
  authorize('ADMIN'),
  orderController.cancelOrder
);
router.delete(
  '/orders/cleanup',
  authenticate,
  authorize('ADMIN'),
  orderController.cleanupOrders
);
router.post(
  '/orders/generate-test',
  authenticate,
  authorize('ADMIN'),
  orderController.generateTestOrders
);
router.delete(
  '/orders/test-orders',
  authenticate,
  authorize('ADMIN'),
  orderController.deleteTestOrders
);

// ============================================
// CONFIG ROUTES
// ============================================
router.get('/config/health', configController.healthCheck);
router.get('/config/stats', authenticate, configController.getSystemStats);
router.get('/config/general', authenticate, configController.getGeneralConfig);
router.put(
  '/config/general',
  authenticate,
  authorize('ADMIN'),
  configController.updateGeneralConfig
);
router.get(
  '/config/mxp',
  authenticate,
  authorize('ADMIN'),
  configController.getMxpConfig
);
router.put(
  '/config/mxp',
  authenticate,
  authorize('ADMIN'),
  configController.updateMxpConfig
);
router.post(
  '/config/mxp/test',
  authenticate,
  authorize('ADMIN'),
  configController.testMxpConnection
);

// Polling control
router.get('/config/polling', authenticate, configController.getPollingStatus);
router.post(
  '/config/polling/start',
  authenticate,
  authorize('ADMIN'),
  configController.startPolling
);
router.post(
  '/config/polling/stop',
  authenticate,
  authorize('ADMIN'),
  configController.stopPolling
);
router.post(
  '/config/polling/force',
  authenticate,
  authorize('ADMIN'),
  configController.forcePoll
);

// ============================================
// CONFIGURATION MODES (Ticket & Print modes)
// ============================================
router.get('/config/modes', authenticate, configController.getConfigModes);
router.put(
  '/config/modes',
  authenticate,
  authorize('ADMIN'),
  configController.updateConfigModes
);
router.post(
  '/config/print/test-centralized',
  authenticate,
  authorize('ADMIN'),
  configController.testCentralizedPrint
);

// ============================================
// API TICKETS (Compatible con sistema anterior)
// ============================================
// Endpoint /config para obtener config de pantalla por IP (sin auth para pantallas)
router.get('/config', configController.getScreenConfigByIp);

// Endpoint /comandas para recibir/enviar comandas por IP (sin auth para pantallas)
router.post('/comandas', configController.receiveComandas);

// Endpoints para recibir tickets via API (requieren auth)
router.post(
  '/tickets/receive',
  authenticate,
  authorize('ADMIN', 'OPERATOR'),
  configController.receiveTicket
);
router.post(
  '/tickets/receive-batch',
  authenticate,
  authorize('ADMIN', 'OPERATOR'),
  configController.receiveTicketsBatch
);

// ============================================
// MIRROR ROUTES (Espejo de KDS remoto - SOLO LECTURA)
// ============================================
router.post(
  '/mirror/configure',
  authenticate,
  authorize('ADMIN'),
  mirrorController.configureMirror
);
router.get('/mirror/test', authenticate, mirrorController.testMirrorConnection);
router.get('/mirror/stats', authenticate, mirrorController.getMirrorStats);
router.get('/mirror/orders', authenticate, mirrorController.getMirrorOrders);
router.get('/mirror/screens', authenticate, mirrorController.getMirrorScreens);
router.get('/mirror/queues', authenticate, mirrorController.getMirrorQueues);
router.post(
  '/mirror/disconnect',
  authenticate,
  authorize('ADMIN'),
  mirrorController.disconnectMirror
);

export default router;
