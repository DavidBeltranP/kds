import { Request, Response } from 'express';
import { prisma } from '../config/database';
import { balancerService } from '../services/balancer.service';
import { createQueueSchema, AuthenticatedRequest } from '../types';
import { asyncHandler, AppError } from '../middlewares/error.middleware';

/**
 * GET /api/queues
 * Obtener todas las colas
 */
export const getAllQueues = asyncHandler(
  async (_req: Request, res: Response) => {
    const queues = await prisma.queue.findMany({
      include: {
        channels: {
          where: { active: true },
          orderBy: { priority: 'desc' },
        },
        filters: {
          where: { active: true },
        },
        screens: {
          select: {
            id: true,
            name: true,
            status: true,
          },
        },
      },
    });

    res.json(queues);
  }
);

/**
 * GET /api/queues/:id
 * Obtener una cola por ID
 */
export const getQueue = asyncHandler(async (req: Request, res: Response) => {
  const { id } = req.params;

  const queue = await prisma.queue.findUnique({
    where: { id },
    include: {
      channels: { orderBy: { priority: 'desc' } },
      filters: true,
      screens: {
        select: {
          id: true,
          name: true,
          number: true,
          status: true,
        },
      },
    },
  });

  if (!queue) {
    throw new AppError(404, 'Queue not found');
  }

  res.json(queue);
});

/**
 * POST /api/queues
 * Crear nueva cola
 */
export const createQueue = asyncHandler(
  async (req: AuthenticatedRequest, res: Response) => {
    const data = createQueueSchema.parse(req.body);

    const queue = await prisma.queue.create({
      data: {
        name: data.name,
        description: data.description,
        distribution: data.distribution,
        channels: data.channels
          ? {
              create: data.channels.map((c, index) => ({
                channel: c.channel,
                color: c.color,
                priority: c.priority ?? index,
              })),
            }
          : undefined,
        filters: data.filters
          ? {
              create: data.filters.map((f) => ({
                pattern: f.pattern,
                suppress: f.suppress,
              })),
            }
          : undefined,
      },
      include: {
        channels: true,
        filters: true,
      },
    });

    res.status(201).json(queue);
  }
);

/**
 * PUT /api/queues/:id
 * Actualizar cola
 */
export const updateQueue = asyncHandler(
  async (req: AuthenticatedRequest, res: Response) => {
    const { id } = req.params;
    const { name, description, distribution, active } = req.body;

    const queue = await prisma.queue.update({
      where: { id },
      data: {
        name,
        description,
        distribution,
        active,
      },
    });

    res.json(queue);
  }
);

/**
 * DELETE /api/queues/:id
 * Eliminar cola
 */
export const deleteQueue = asyncHandler(
  async (req: AuthenticatedRequest, res: Response) => {
    const { id } = req.params;

    // Verificar que no haya pantallas asignadas
    const screensCount = await prisma.screen.count({
      where: { queueId: id },
    });

    if (screensCount > 0) {
      throw new AppError(400, 'Cannot delete queue with assigned screens');
    }

    await prisma.queue.delete({
      where: { id },
    });

    res.status(204).send();
  }
);

/**
 * POST /api/queues/:id/channels
 * Agregar canal a cola
 */
export const addChannel = asyncHandler(
  async (req: AuthenticatedRequest, res: Response) => {
    const { id } = req.params;
    const { channel, color, priority } = req.body;

    const queueChannel = await prisma.queueChannel.create({
      data: {
        queueId: id,
        channel,
        color: color || '#4a90e2',
        priority: priority || 0,
      },
    });

    res.status(201).json(queueChannel);
  }
);

/**
 * PUT /api/queues/:id/channels/:channelId
 * Actualizar canal
 */
export const updateChannel = asyncHandler(
  async (req: AuthenticatedRequest, res: Response) => {
    const { channelId } = req.params;
    const { channel, color, priority, active } = req.body;

    const queueChannel = await prisma.queueChannel.update({
      where: { id: channelId },
      data: { channel, color, priority, active },
    });

    res.json(queueChannel);
  }
);

/**
 * DELETE /api/queues/:id/channels/:channelId
 * Eliminar canal
 */
export const deleteChannel = asyncHandler(
  async (req: AuthenticatedRequest, res: Response) => {
    const { channelId } = req.params;

    await prisma.queueChannel.delete({
      where: { id: channelId },
    });

    res.status(204).send();
  }
);

/**
 * POST /api/queues/:id/filters
 * Agregar filtro a cola
 */
export const addFilter = asyncHandler(
  async (req: AuthenticatedRequest, res: Response) => {
    const { id } = req.params;
    const { pattern, suppress } = req.body;

    const filter = await prisma.queueFilter.create({
      data: {
        queueId: id,
        pattern,
        suppress: suppress || false,
      },
    });

    res.status(201).json(filter);
  }
);

/**
 * DELETE /api/queues/:id/filters/:filterId
 * Eliminar filtro
 */
export const deleteFilter = asyncHandler(
  async (req: AuthenticatedRequest, res: Response) => {
    const { filterId } = req.params;

    await prisma.queueFilter.delete({
      where: { id: filterId },
    });

    res.status(204).send();
  }
);

/**
 * GET /api/queues/:id/stats
 * Obtener estadísticas de balanceo de cola
 */
export const getQueueStats = asyncHandler(
  async (req: Request, res: Response) => {
    const { id } = req.params;

    const stats = await balancerService.getBalanceStats(id);

    res.json(stats);
  }
);

/**
 * POST /api/queues/:id/reset-balance
 * Reiniciar índice de balanceo
 */
export const resetBalance = asyncHandler(
  async (req: AuthenticatedRequest, res: Response) => {
    const { id } = req.params;

    await balancerService.resetBalanceIndex(id);

    res.json({ message: 'Balance index reset' });
  }
);
