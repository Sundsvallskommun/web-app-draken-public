import { User } from '@common/interfaces/user';

import { ApiResponse, apiService } from './api-service';

export const emptyUser: User = {
  name: '',
  firstName: '',
  lastName: '',
  email: '',
  username: '',
  userSettings: {
    readNotificationsClearedDate: '',
  },
  permissions: {
    canEditCasedata: false,
    canEditSupportManagement: false,
    canViewAttestations: false,
    canEditAttestations: false,
    canViewOtherNamespaces: false,
  },
};

const handleSetUserResponse = (res: ApiResponse<User>): User => ({
  name: res.data.name,
  email: res.data.email,
  username: res.data.username,
  firstName: res.data.firstName,
  lastName: res.data.lastName,
  userSettings: {
    readNotificationsClearedDate: res.data.userSettings.readNotificationsClearedDate,
  },
  permissions: res.data.permissions,
});

export const getMe: () => Promise<User> = () => {
  return apiService
    .get<ApiResponse<User>>('me')
    .then((res) => handleSetUserResponse(res.data))
    .catch((err) => {
      return Promise.reject(err.response?.data?.message);
    });
};

interface AdUser {
  description: string;
  displayName: string;
  domain: string;
  guid: string;
  isLinked: string;
  name: string;
  ouPath: string;
  personId: string;
  schemaClassName: string;
}

export interface Admin {
  displayName: string;
  firstName: string;
  lastName: string;
  adAccount: string;
  id: string;
}

export interface EmployeeInfo {
  personid: string;
  givenname: string;
  lastname: string;
  fullname: string;
  address: string;
  postalCode: string;
  city: string;
  workPhone: string;
  mobilePhone: string;
  extraMobilePhone: string;
  aboutMe: string;
  email: string;
  mailNickname: string;
  company: string;
  companyId: number;
  orgTree: string;
  referenceNumber: string;
  isManager: true;
  loginName: string;
}

export const getAdminUsers: () => Promise<Admin[]> = () => {
  return apiService
    .get<ApiResponse<AdUser[]>>(`users/admins`)
    .then((res) =>
      res.data.data.map((u) => ({
        displayName: u.displayName,
        firstName: u.displayName.split(' ')[1],
        lastName: u.displayName.split(' ')[0],
        adAccount: u.name,
        id: u.guid,
      }))
    )
    .catch((err) => {
      return Promise.reject(err.response?.data?.message);
    });
};

export const getInitialsFromADUsername: (username: string, admins: Admin[]) => string | undefined = (
  username,
  admins
) => {
  const admin = admins.find((a) => a.adAccount === username);
  return admin ? `${admin.firstName[0]}${admin.lastName[0]}` : undefined;
};

export const getUserInfo: (adAccount: string) => Promise<EmployeeInfo> = (adAccount) => {
  return apiService
    .get<ApiResponse<EmployeeInfo>>(`user/${adAccount}`)
    .then((res) => {
      return res.data.data;
    })
    .catch((err) => {
      return Promise.reject(err.response?.data?.message);
    });
};
