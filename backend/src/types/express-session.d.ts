import { User } from '@interfaces/users.interface';
import { Session } from 'express-session';

declare module 'express-session' {
  interface Session {
    returnTo?: string;
    user?: User;
    passport?: any;
    messages: string[];
  }
}
