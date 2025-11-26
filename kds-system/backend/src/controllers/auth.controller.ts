import { Request, Response } from 'express';
import { authService } from '../services/auth.service';
import { loginSchema, AuthenticatedRequest } from '../types';
import { asyncHandler, AppError } from '../middlewares/error.middleware';

/**
 * POST /api/auth/login
 * Autenticación de usuario
 */
export const login = asyncHandler(async (req: Request, res: Response) => {
  const { email, password } = loginSchema.parse(req.body);

  const result = await authService.login(email, password);

  if (!result) {
    throw new AppError(401, 'Invalid credentials');
  }

  res.json(result);
});

/**
 * POST /api/auth/refresh
 * Refrescar token de acceso
 */
export const refresh = asyncHandler(async (req: Request, res: Response) => {
  const { refreshToken } = req.body;

  if (!refreshToken) {
    throw new AppError(400, 'Refresh token required');
  }

  const result = await authService.refreshAccessToken(refreshToken);

  if (!result) {
    throw new AppError(401, 'Invalid refresh token');
  }

  res.json(result);
});

/**
 * GET /api/auth/me
 * Obtener usuario actual
 */
export const me = asyncHandler(
  async (req: AuthenticatedRequest, res: Response) => {
    res.json({ user: req.user });
  }
);

/**
 * POST /api/auth/change-password
 * Cambiar contraseña
 */
export const changePassword = asyncHandler(
  async (req: AuthenticatedRequest, res: Response) => {
    const { currentPassword, newPassword } = req.body;

    if (!currentPassword || !newPassword) {
      throw new AppError(400, 'Current and new password required');
    }

    if (newPassword.length < 6) {
      throw new AppError(400, 'New password must be at least 6 characters');
    }

    const success = await authService.changePassword(
      req.user!.userId,
      currentPassword,
      newPassword
    );

    if (!success) {
      throw new AppError(400, 'Invalid current password');
    }

    res.json({ message: 'Password changed successfully' });
  }
);
