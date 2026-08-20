import { HttpException } from '@exceptions/HttpException';
import { RequestWithUser } from '@interfaces/auth.interface';
import { InternalRoleMap, Permissions } from '@interfaces/users.interface';
import { getPermissions } from '@services/authorization.service';
import { logger } from '@utils/logger';
import { NextFunction, Response } from 'express';

type KeyOfMap<M extends Map<unknown, unknown>> = M extends Map<infer K, unknown> ? K : never;

export const hasPermissions = (permissions: Array<keyof Permissions>) => async (req: RequestWithUser, res: Response, next: NextFunction) => {
  const userPermissions = req.user?.permissions || [];
  if (permissions.every(permission => userPermissions[permission])) {
    next();
  } else {
    logger.error('Missing permissions');
    next(new HttpException(403, 'Missing permissions'));
  }
};

export const hasAnyPermission = (permissions: Array<keyof Permissions>) => async (req: RequestWithUser, res: Response, next: NextFunction) => {
  const userPermissions = req.user?.permissions || [];
  if (permissions.some(permission => userPermissions[permission])) {
    next();
  } else {
    logger.error('Missing permissions');
    next(new HttpException(403, 'Missing permissions'));
  }
};

export const hasRoles = (roles: Array<KeyOfMap<InternalRoleMap>>) => async (req: RequestWithUser, res: Response, next: NextFunction) => {
  const endpointPermissions = getPermissions(roles);
  const userPermissions = getPermissions(req.user?.groups || []);
  if (
    (Object.keys(endpointPermissions) as Array<keyof Permissions>).every(permission =>
      endpointPermissions[permission] ? userPermissions[permission] : true,
    )
  ) {
    next();
  } else {
    logger.error('Missing permissions');
    next(new HttpException(403, 'Missing permissions'));
  }
};
