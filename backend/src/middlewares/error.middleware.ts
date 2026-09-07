import { HttpException } from '@exceptions/HttpException';
import { NextFunction, Request, Response } from 'express';

import { createRequestDiagnostics, currentRequestDiagnostics, logHttpRequest } from '@/services/request-diagnostics';

const errorMiddleware = (error: HttpException, req: Request, res: Response, next: NextFunction) => {
  try {
    const status: number = error.status || 500;
    const message: string = error.message || 'Something went wrong';
    const diagnostics = currentRequestDiagnostics() ?? createRequestDiagnostics(req.method, () => '<unmatched>');
    logHttpRequest(diagnostics, status, error);
    res.status(status).json({ message });
  } catch (error) {
    next(error);
  }
};

export default errorMiddleware;
