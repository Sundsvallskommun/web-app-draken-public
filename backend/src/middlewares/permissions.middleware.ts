import { NextFunction, Request, Response } from 'express';
import { HttpException } from '@exceptions/HttpException';
import { getPermissions } from '@services/authorization.service';
import { InternalRoleMap, Permissions } from '@interfaces/users.interface';
import { logger } from '@utils/logger';

type KeyOfMap<M extends Map<unknown, unknown>> = M extends Map<infer K, unknown> ? K : never;

export const hasPermissions = (permissions: Array<keyof Permissions>) => async (req: Request, res: Response, next: NextFunction) => {
  const userPermissions = req.user?.permissions || [];
  if (permissions.every(permission => userPermissions[permission])) {
    next();
  } else {
    logger.error('Missing permissions');
    next(new HttpException(403, 'Missing permissions'));
  }
};

export const hasRoles = (roles: Array<KeyOfMap<InternalRoleMap>>) => async (req: Request, res: Response, next: NextFunction) => {
  const endpointPermissions = getPermissions(roles);
  const userPermissions = getPermissions(req.user?.groups || []);
  if (Object.keys(endpointPermissions).every(permission => (endpointPermissions[permission] ? userPermissions[permission] : true))) {
    next();
  } else {
    logger.error('Missing permissions');
    next(new HttpException(403, 'Missing permissions'));
  }
};
