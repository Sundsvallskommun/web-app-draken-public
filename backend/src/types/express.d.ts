import { User } from '@interfaces/users.interface';

declare module 'express-serve-static-core' {
  export interface Request {
    user?: any | User;
  }
}
