/* eslint-disable */
/* tslint:disable */
/*
 * ---------------------------------------------------------------
 * ## THIS FILE WAS GENERATED VIA SWAGGER-TYPESCRIPT-API        ##
 * ##                                                           ##
 * ## AUTHOR: acacode                                           ##
 * ## SOURCE: https://github.com/acacode/swagger-typescript-api ##
 * ---------------------------------------------------------------
 */

export interface Employee {
  /** @format uuid */
  personId?: string;
  personNumber?: string | null;
  isClassified?: boolean;
  givenname?: string | null;
  middlename?: string | null;
  lastname?: string | null;
  loginname?: string | null;
  emailAddress?: string | null;
  referenceNumber?: string | null;
  isManager?: boolean | null;
  employments?: Employment[] | null;
  employeeEvents?: EmployeeEvent[] | null;
}

export interface EmployeeEvent {
  /** @format int32 */
  companyId?: number;
  /** @format date-time */
  startDate?: string | null;
  /** @format date-time */
  endDate?: string | null;
  title?: string | null;
  /** @format int32 */
  orgId?: number;
  orgName?: string | null;
  /** @format int32 */
  topOrgId?: number;
  topOrgName?: string | null;
  /** @format int32 */
  benefitGroupId?: number | null;
  eventType?: string | null;
  eventInfo?: string | null;
}

export interface Employment {
  /** @format int32 */
  companyId?: number;
  /** @format date-time */
  startDate?: string;
  /** @format date-time */
  endDate?: string | null;
  /** @format int32 */
  employmentType?: number;
  title?: string | null;
  managerCode?: string | null;
  /** @format int32 */
  orgId?: number;
  orgName?: string | null;
  /** @format int32 */
  topOrgId?: number;
  topOrgName?: string | null;
  /** @format int32 */
  benefitGroupId?: number | null;
  formOfEmploymentId?: string | null;
  isManual?: boolean;
  paTeam?: string | null;
  isMainEmployment?: boolean;
  isManager?: boolean | null;
  manager?: Manager;
  aid?: string | null;
  empRowId?: string | null;
}

export interface LoginName {
  domain?: string | null;
  loginName?: string | null;
}

export interface Manager {
  /** @format uuid */
  personId?: string;
  givenname?: string | null;
  middlename?: string | null;
  lastname?: string | null;
  loginname?: string | null;
  emailAddress?: string | null;
  referenceNumber?: string | null;
}

export interface ManagerEmployee {
  /** @format uuid */
  personId?: string;
  /** @format date-time */
  hireDate?: string | null;
  /** @format date-time */
  retireDate?: string | null;
}

export interface ModelPostPersonImage {
  title?: string | null;
  imageData?: string | null;
}

export interface PortalPersonData {
  /** @format uuid */
  personid?: string;
  givenname?: string | null;
  lastname?: string | null;
  fullname?: string | null;
  address?: string | null;
  postalCode?: string | null;
  city?: string | null;
  workPhone?: string | null;
  mobilePhone?: string | null;
  extraMobilePhone?: string | null;
  aboutMe?: string | null;
  email?: string | null;
  mailNickname?: string | null;
  company?: string | null;
  /** @format int32 */
  companyId?: number;
  orgTree?: string | null;
  referenceNumber?: string | null;
  isManager?: boolean;
  loginName?: string | null;
  fullOrgTree?: string | null;
}

export interface ProblemDetails {
  type?: string | null;
  title?: string | null;
  /** @format int32 */
  status?: number | null;
  detail?: string | null;
  instance?: string | null;
  [key: string]: any;
}
