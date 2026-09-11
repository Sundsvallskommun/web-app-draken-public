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

export const saveUserSettings: (settings: any) => Promise<boolean> = (settings) => {
  return apiService
    .patch('settings', settings)
    .then(() => Promise.resolve(true))
    .catch((e) => {
      return Promise.resolve(false);
    });
};

export interface AdUser {
  description: string;
  displayName: string;
  domain: string;
  guid: string;
  isLinked: string;
  name: string;
  ouPath: string;
  personId: string;
  schemaClassName: string;
  /** Present only when the deployment configured handler roles. */
  roleKeys?: string[];
}

export interface Admin {
  displayName: string;
  firstName: string;
  lastName: string;
  adAccount: string;
  id: string;
  /**
   * The handler roles this account holds. Absent when the deployment configured no roles at all,
   * which is a different thing from holding none of them: the selector groups by role only when the
   * deployment has roles to group by.
   */
  roleKeys?: string[];
}

/** One handler role. Presentation only - who may be assigned what is decided in the backend. */
export interface HandlerRole {
  key: string;
  label: string;
}

export interface HandlerDirectory {
  administrators: Admin[];
  /** Absent when the deployment configured no roles, so the selector stays one flat list. */
  roles?: HandlerRole[];
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

interface HandlerDirectoryResponse extends ApiResponse<AdUser[]> {
  roles?: HandlerRole[];
}

const toHandlerDirectory = (body: HandlerDirectoryResponse): HandlerDirectory => ({
  administrators: body.data.map((u) => ({
    displayName: u.displayName,
    firstName: u.displayName.split(' ')[1],
    lastName: u.displayName.split(' ')[0],
    adAccount: u.name,
    id: u.guid,
    ...(u.roleKeys ? { roleKeys: u.roleKeys } : {}),
  })),
  ...(body.roles ? { roles: body.roles } : {}),
});

export const getHandlerDirectory: () => Promise<HandlerDirectory> = () => {
  return apiService
    .get<HandlerDirectoryResponse>(`users/admins`)
    .then((res) => toHandlerDirectory(res.data))
    .catch((err) => {
      return Promise.reject(err.response?.data?.message);
    });
};

export const getAvatar: (width: string) => Promise<string> = (width) => {
  return apiService
    .get<ApiResponse<string>>(`user/avatar?width=${width}`)
    .then((res) => res.data.data)
    .catch((err) => {
      return Promise.reject(err.response?.data?.message);
    });
};

export const getNameFromADUsername: (username: string, admins: Admin[]) => string | undefined = (username, admins) => {
  const admin = admins.find((a) => a.adAccount === username);
  return admin ? `${admin.firstName} ${admin.lastName}` : undefined;
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

/**
 * The handlers who can be assigned one specific errand.
 *
 * The ordinary handler directory is the same for every errand, so it keeps offering people who can
 * no longer reach the one in front of you. This asks per errand instead, and a deployment with
 * nothing to filter by simply gets the same list back.
 */
export const getAssignableHandlers: (municipalityId: string, errandId: string) => Promise<HandlerDirectory> = (
  municipalityId,
  errandId
) =>
  apiService
    .get<HandlerDirectoryResponse>(`supporterrands/${municipalityId}/${errandId}/assignable-handlers`)
    .then((res) => toHandlerDirectory(res.data));
