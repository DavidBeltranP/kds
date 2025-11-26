import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { prisma } from '../config/database';
import { env } from '../config/env';
import { JwtPayload } from '../types';
import { logger } from '../utils/logger';

/**
 * Servicio de autenticación
 */
export class AuthService {
  /**
   * Autentica un usuario y retorna tokens
   */
  async login(
    email: string,
    password: string
  ): Promise<{ accessToken: string; refreshToken: string; user: JwtPayload } | null> {
    try {
      // Buscar usuario
      const user = await prisma.user.findUnique({
        where: { email },
      });

      if (!user || !user.active) {
        return null;
      }

      // Verificar contraseña
      const isValid = await bcrypt.compare(password, user.password);
      if (!isValid) {
        return null;
      }

      // Generar tokens
      const payload: JwtPayload = {
        userId: user.id,
        email: user.email,
        role: user.role as JwtPayload['role'],
      };

      const accessToken = jwt.sign(payload, env.JWT_SECRET, {
        expiresIn: env.JWT_ACCESS_EXPIRATION,
      });

      const refreshToken = jwt.sign(
        { userId: user.id },
        env.JWT_SECRET,
        { expiresIn: env.JWT_REFRESH_EXPIRATION }
      );

      logger.info(`User logged in: ${email}`);

      return {
        accessToken,
        refreshToken,
        user: payload,
      };
    } catch (error) {
      logger.error('Login error', { error, email });
      throw error;
    }
  }

  /**
   * Refresca el token de acceso
   */
  async refreshAccessToken(
    refreshToken: string
  ): Promise<{ accessToken: string } | null> {
    try {
      const decoded = jwt.verify(refreshToken, env.JWT_SECRET) as {
        userId: string;
      };

      const user = await prisma.user.findUnique({
        where: { id: decoded.userId },
      });

      if (!user || !user.active) {
        return null;
      }

      const payload: JwtPayload = {
        userId: user.id,
        email: user.email,
        role: user.role as JwtPayload['role'],
      };

      const accessToken = jwt.sign(payload, env.JWT_SECRET, {
        expiresIn: env.JWT_ACCESS_EXPIRATION,
      });

      return { accessToken };
    } catch (error) {
      return null;
    }
  }

  /**
   * Verifica un token
   */
  verifyToken(token: string): JwtPayload | null {
    try {
      return jwt.verify(token, env.JWT_SECRET) as JwtPayload;
    } catch {
      return null;
    }
  }

  /**
   * Crea un nuevo usuario
   */
  async createUser(
    email: string,
    password: string,
    name: string,
    role: 'ADMIN' | 'OPERATOR' | 'VIEWER' = 'OPERATOR'
  ): Promise<{ id: string; email: string; name: string; role: string }> {
    const hashedPassword = await bcrypt.hash(password, 10);

    const user = await prisma.user.create({
      data: {
        email,
        password: hashedPassword,
        name,
        role,
      },
    });

    logger.info(`User created: ${email}`);

    return {
      id: user.id,
      email: user.email,
      name: user.name,
      role: user.role,
    };
  }

  /**
   * Cambia la contraseña de un usuario
   */
  async changePassword(
    userId: string,
    currentPassword: string,
    newPassword: string
  ): Promise<boolean> {
    const user = await prisma.user.findUnique({
      where: { id: userId },
    });

    if (!user) {
      return false;
    }

    const isValid = await bcrypt.compare(currentPassword, user.password);
    if (!isValid) {
      return false;
    }

    const hashedPassword = await bcrypt.hash(newPassword, 10);
    await prisma.user.update({
      where: { id: userId },
      data: { password: hashedPassword },
    });

    logger.info(`Password changed for user: ${user.email}`);
    return true;
  }

  /**
   * Crea el usuario admin por defecto si no existe
   */
  async ensureAdminExists(): Promise<void> {
    const adminExists = await prisma.user.findFirst({
      where: { role: 'ADMIN' },
    });

    if (!adminExists) {
      await this.createUser(
        env.ADMIN_EMAIL,
        env.ADMIN_PASSWORD,
        'Administrador',
        'ADMIN'
      );
      logger.info('Default admin user created');
    }
  }
}

// Singleton
export const authService = new AuthService();
