import { Request, Response, NextFunction } from 'express';
import authService from '../services/auth.service';
import { UserRole } from '../models/User';

// Extend Express Request to include user data
declare global {
  namespace Express {
    interface Request {
      user?: {
        userId: string;
        email: string;
        role: UserRole;
      };
      requestId?: string;
    }
  }
}

export const authenticateToken = (
  req: Request,
  res: Response,
  next: NextFunction
): void => {
  try {
    const authHeader = req.headers.authorization;
    const token = authHeader && authHeader.split(' ')[1];

    if (!token) {
      res.status(401).json({
        success: false,
        message: 'Access token not provided',
        errorCode: 'NO_ACCESS_TOKEN',
      });
      return;
    }

    const decoded = authService.verifyAccessToken(token);
    req.user = decoded;
    next();
  } catch (error) {
    res.status(401).json({
      success: false,
      message: 'Invalid or expired access token',
      errorCode: 'INVALID_TOKEN',
    });
  }
};

export const requireRole = (...roles: UserRole[]) => {
  return (req: Request, res: Response, next: NextFunction): void => {
    if (!req.user) {
      res.status(401).json({
        success: false,
        message: 'User not authenticated',
        errorCode: 'NOT_AUTHENTICATED',
      });
      return;
    }

    if (!roles.includes(req.user.role)) {
      res.status(403).json({
        success: false,
        message: 'User does not have required role',
        errorCode: 'INSUFFICIENT_PERMISSIONS',
      });
      return;
    }

    next();
  };
};

export const isCustomer = (
  req: Request,
  res: Response,
  next: NextFunction
): void => {
  if (!req.user) {
    res.status(401).json({
      success: false,
      message: 'User not authenticated',
      errorCode: 'NOT_AUTHENTICATED',
    });
    return;
  }

  if (req.user.role !== UserRole.CUSTOMER) {
    res.status(403).json({
      success: false,
      message: 'Customer role required',
      errorCode: 'CUSTOMER_ROLE_REQUIRED',
    });
    return;
  }

  next();
};

export const isOrganizer = (
  req: Request,
  res: Response,
  next: NextFunction
): void => {
  if (!req.user) {
    res.status(401).json({
      success: false,
      message: 'User not authenticated',
      errorCode: 'NOT_AUTHENTICATED',
    });
    return;
  }

  if (req.user.role !== UserRole.ORGANIZER) {
    res.status(403).json({
      success: false,
      message: 'Organizer role required',
      errorCode: 'ORGANIZER_ROLE_REQUIRED',
    });
    return;
  }

  next();
};

export const isAdmin = (
  req: Request,
  res: Response,
  next: NextFunction
): void => {
  if (!req.user) {
    res.status(401).json({
      success: false,
      message: 'User not authenticated',
      errorCode: 'NOT_AUTHENTICATED',
    });
    return;
  }

  if (req.user.role !== UserRole.ADMIN) {
    res.status(403).json({
      success: false,
      message: 'Admin role required',
      errorCode: 'ADMIN_ROLE_REQUIRED',
    });
    return;
  }

  next();
};
