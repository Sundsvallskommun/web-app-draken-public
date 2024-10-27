import { HttpException } from '@exceptions/HttpException';
import { NextFunction, Request, Response } from 'express';

const authMiddleware = async (req: Request, res: Response, next: NextFunction) => {
  try {
    if (req.isAuthenticated()) {
      next();
    } else {
      // next(new HttpException(401, 'Not Authorized'));
      if (req.session.messages?.length > 0) {
        next(new HttpException(401, req.session.messages[0]));
      } else {
        next(new HttpException(401, 'Not Authorized'));
      }
    }
  } catch (error) {
    next(new HttpException(401, 'Failed to authorize'));
  }
};

export default authMiddleware;
