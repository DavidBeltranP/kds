import { Response } from 'express';
import { prisma } from '../config/database';
import { AuthenticatedRequest } from '../types';
import { asyncHandler, AppError } from '../middlewares/error.middleware';
import bcrypt from 'bcryptjs';
import { z } from 'zod';

const createUserSchema = z.object({
  email: z.string().email('Email inválido'),
  password: z.string().min(6, 'La contraseña debe tener al menos 6 caracteres'),
  name: z.string().min(2, 'El nombre debe tener al menos 2 caracteres'),
  role: z.enum(['ADMIN', 'OPERATOR', 'VIEWER']),
});

const updateUserSchema = z.object({
  email: z.string().email('Email inválido').optional(),
  name: z.string().min(2, 'El nombre debe tener al menos 2 caracteres').optional(),
  role: z.enum(['ADMIN', 'OPERATOR', 'VIEWER']).optional(),
  active: z.boolean().optional(),
  password: z.string().min(6, 'La contraseña debe tener al menos 6 caracteres').optional(),
});

/**
 * GET /api/users
 * Obtener todos los usuarios
 */
export const getAllUsers = asyncHandler(
  async (_req: AuthenticatedRequest, res: Response) => {
    const users = await prisma.user.findMany({
      select: {
        id: true,
        email: true,
        name: true,
        role: true,
        active: true,
        createdAt: true,
        updatedAt: true,
      },
      orderBy: { createdAt: 'desc' },
    });

    res.json(users);
  }
);

/**
 * GET /api/users/:id
 * Obtener un usuario por ID
 */
export const getUser = asyncHandler(
  async (req: AuthenticatedRequest, res: Response) => {
    const { id } = req.params;

    const user = await prisma.user.findUnique({
      where: { id },
      select: {
        id: true,
        email: true,
        name: true,
        role: true,
        active: true,
        createdAt: true,
        updatedAt: true,
      },
    });

    if (!user) {
      throw new AppError(404, 'Usuario no encontrado');
    }

    res.json(user);
  }
);

/**
 * POST /api/users
 * Crear un nuevo usuario
 */
export const createUser = asyncHandler(
  async (req: AuthenticatedRequest, res: Response) => {
    const data = createUserSchema.parse(req.body);

    // Verificar si el email ya existe
    const existing = await prisma.user.findUnique({
      where: { email: data.email },
    });

    if (existing) {
      throw new AppError(400, 'El email ya está registrado');
    }

    // Hash de la contraseña
    const hashedPassword = await bcrypt.hash(data.password, 10);

    const user = await prisma.user.create({
      data: {
        email: data.email,
        password: hashedPassword,
        name: data.name,
        role: data.role,
      },
      select: {
        id: true,
        email: true,
        name: true,
        role: true,
        active: true,
        createdAt: true,
        updatedAt: true,
      },
    });

    res.status(201).json(user);
  }
);

/**
 * PUT /api/users/:id
 * Actualizar un usuario
 */
export const updateUser = asyncHandler(
  async (req: AuthenticatedRequest, res: Response) => {
    const { id } = req.params;
    const data = updateUserSchema.parse(req.body);

    // Verificar si el usuario existe
    const existing = await prisma.user.findUnique({
      where: { id },
    });

    if (!existing) {
      throw new AppError(404, 'Usuario no encontrado');
    }

    // Si se está actualizando el email, verificar que no exista
    if (data.email && data.email !== existing.email) {
      const emailExists = await prisma.user.findUnique({
        where: { email: data.email },
      });
      if (emailExists) {
        throw new AppError(400, 'El email ya está registrado');
      }
    }

    // Preparar datos de actualización
    const updateData: any = {
      email: data.email,
      name: data.name,
      role: data.role,
      active: data.active,
    };

    // Si se proporciona nueva contraseña, hashearla
    if (data.password) {
      updateData.password = await bcrypt.hash(data.password, 10);
    }

    // Eliminar campos undefined
    Object.keys(updateData).forEach(key => {
      if (updateData[key] === undefined) {
        delete updateData[key];
      }
    });

    const user = await prisma.user.update({
      where: { id },
      data: updateData,
      select: {
        id: true,
        email: true,
        name: true,
        role: true,
        active: true,
        createdAt: true,
        updatedAt: true,
      },
    });

    res.json(user);
  }
);

/**
 * DELETE /api/users/:id
 * Eliminar un usuario
 */
export const deleteUser = asyncHandler(
  async (req: AuthenticatedRequest, res: Response) => {
    const { id } = req.params;

    // Verificar si el usuario existe
    const existing = await prisma.user.findUnique({
      where: { id },
    });

    if (!existing) {
      throw new AppError(404, 'Usuario no encontrado');
    }

    // No permitir eliminar el propio usuario
    if (req.user?.userId === id) {
      throw new AppError(400, 'No puedes eliminar tu propio usuario');
    }

    // Verificar que quede al menos un admin
    if (existing.role === 'ADMIN') {
      const adminCount = await prisma.user.count({
        where: { role: 'ADMIN', active: true },
      });
      if (adminCount <= 1) {
        throw new AppError(400, 'Debe existir al menos un administrador activo');
      }
    }

    await prisma.user.delete({
      where: { id },
    });

    res.json({ message: 'Usuario eliminado correctamente' });
  }
);

/**
 * POST /api/users/:id/toggle-active
 * Activar/Desactivar un usuario
 */
export const toggleUserActive = asyncHandler(
  async (req: AuthenticatedRequest, res: Response) => {
    const { id } = req.params;

    const existing = await prisma.user.findUnique({
      where: { id },
    });

    if (!existing) {
      throw new AppError(404, 'Usuario no encontrado');
    }

    // No permitir desactivar el propio usuario
    if (req.user?.userId === id) {
      throw new AppError(400, 'No puedes desactivar tu propio usuario');
    }

    // Si es admin y se va a desactivar, verificar que quede al menos uno
    if (existing.role === 'ADMIN' && existing.active) {
      const adminCount = await prisma.user.count({
        where: { role: 'ADMIN', active: true },
      });
      if (adminCount <= 1) {
        throw new AppError(400, 'Debe existir al menos un administrador activo');
      }
    }

    const user = await prisma.user.update({
      where: { id },
      data: { active: !existing.active },
      select: {
        id: true,
        email: true,
        name: true,
        role: true,
        active: true,
        createdAt: true,
        updatedAt: true,
      },
    });

    res.json(user);
  }
);
