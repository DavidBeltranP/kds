import { Response, NextFunction } from 'express';
import { AuthenticatedRequest, JwtPayload } from '../types';
import { authService } from '../services/auth.service';

/**
 * Middleware de autenticación JWT
 */
export function authenticate(
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): void {
  const authHeader = req.headers.authorization;

  if (!authHeader) {
    res.status(401).json({ error: 'No authorization header' });
    return;
  }

  const [type, token] = authHeader.split(' ');

  if (type !== 'Bearer' || !token) {
    res.status(401).json({ error: 'Invalid authorization format' });
    return;
  }

  const payload = authService.verifyToken(token);

  if (!payload) {
    res.status(401).json({ error: 'Invalid or expired token' });
    return;
  }

  req.user = payload;
  next();
}

/**
 * Middleware para verificar roles
 */
export function authorize(...roles: JwtPayload['role'][]) {
  return (
    req: AuthenticatedRequest,
    res: Response,
    next: NextFunction
  ): void => {
    if (!req.user) {
      res.status(401).json({ error: 'Not authenticated' });
      return;
    }

    if (!roles.includes(req.user.role)) {
      res.status(403).json({ error: 'Insufficient permissions' });
      return;
    }

    next();
  };
}

/**
 * Middleware opcional de autenticación (no falla si no hay token)
 */
export function optionalAuth(
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): void {
  const authHeader = req.headers.authorization;

  if (authHeader) {
    const [type, token] = authHeader.split(' ');

    if (type === 'Bearer' && token) {
      const payload = authService.verifyToken(token);
      if (payload) {
        req.user = payload;
      }
    }
  }

  next();
}
