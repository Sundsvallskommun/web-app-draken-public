import { formatOrgNr } from '@utils/util';
import { NextFunction, Request, Response } from 'express';

export const ensureLoggedIn = options => {
  if (typeof options == 'string') {
    options = { redirectTo: options };
  }
  options = options || {};

  const url = options.redirectTo || '/api/saml/login';
  const setReturnTo = options.setReturnTo === undefined ? true : options.setReturnTo;

  return function (req: Request, res: Response, next: NextFunction) {
    if (!req.isAuthenticated || !req.isAuthenticated()) {
      if (setReturnTo && req.session) {
        req.session.returnTo = req.originalUrl || req.url;
      }
      return res.redirect(url);
    }
    next();
  };
};
