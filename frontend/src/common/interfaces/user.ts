interface Permissions {
  canEditCasedata: boolean;
  canEditSupportManagement: boolean;
  canViewAttestations: boolean;
  canEditAttestations: boolean;
  canViewOtherNamespaces: boolean;
}

export interface User {
  name: string;
  email: string;
  username: string;
  firstName: string;
  lastName: string;
  userSettings: {
    readNotificationsClearedDate: string;
  };
  permissions: Permissions;
}
