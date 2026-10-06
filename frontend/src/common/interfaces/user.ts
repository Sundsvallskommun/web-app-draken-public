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
  /** The handler roles the user holds; absent where the deployment configured none. */
  roleKeys?: string[];
  /** Whether the user is in the superadmin group - in the avvikelse applications, the administrators. */
  superadmin?: boolean;
}
