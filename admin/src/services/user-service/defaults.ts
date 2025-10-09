import { ApiResponse } from '@services/api-service';
import { User } from './user-service';

export interface UserPermissions {
  canUseAdminPanel: boolean;
}

export const defaultPermissions: UserPermissions = {
  canUseAdminPanel: false,
};

export const emptyUser: User = {
  name: '',
  username: '',
  permissions: defaultPermissions,
};

export const emptyUserResponse: ApiResponse<User> = {
  data: emptyUser,
  message: 'none',
};
