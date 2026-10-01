/* eslint-disable */
/* tslint:disable */
// @ts-nocheck
/*
 * ---------------------------------------------------------------
 * ## THIS FILE WAS GENERATED VIA SWAGGER-TYPESCRIPT-API        ##
 * ##                                                           ##
 * ## AUTHOR: acacode                                           ##
 * ## SOURCE: https://github.com/acacode/swagger-typescript-api ##
 * ---------------------------------------------------------------
 */

/** The sort order direction */
export enum Direction {
  ASC = "ASC",
  DESC = "DESC",
}

export interface Problem {
  /** @format uri */
  instance?: string;
  /** @format uri */
  type?: string;
  title?: string;
  detail?: string;
  /** @format int32 */
  status?: number;
}

export interface ImportResult {
  /** @format int32 */
  rowsProcessed?: number;
  /** @format int32 */
  addressesCreated?: number;
  /** @format int32 */
  licenseHoldersCreated?: number;
  /** @format int32 */
  restaurantNumbersCreated?: number;
  /** @format int32 */
  assignmentsCreated?: number;
  errors?: string[];
  conflictingRestaurantNumbers?: string[];
}

/** Request model for assigning a restaurant number to a license holder at an address */
export interface AssignmentCreateRequest {
  /**
   * ID of the restaurant number to assign
   * @minLength 1
   */
  restaurantNumberId: string;
  /**
   * ID of the address the restaurant number is assigned to
   * @minLength 1
   */
  addressId: string;
  /**
   * Organization number of the license holder
   * @minLength 1
   */
  orgNumber: string;
  /**
   * Name of the license holder as registered for this assignment
   * @minLength 1
   */
  holderName: string;
  /** Name of the premises */
  premisesName?: string;
  /**
   * First day the assignment is valid
   * @format date
   */
  validFrom: string;
  /**
   * Last day the assignment is valid, omit for an open ended assignment
   * @format date
   */
  validTo?: string;
}

/** Address model */
export interface Address {
  /** Address ID */
  id?: string;
  /**
   * Street address
   * @minLength 1
   */
  streetAddress: string;
  /**
   * Postal code
   * @minLength 1
   */
  postalCode: string;
  /** Postal area */
  postalArea?: string;
  /** Municipality ID */
  municipalityId?: string;
  /**
   * Timestamp when the address was created
   * @format date-time
   */
  created?: string;
}

/** Request model for updating an assignment. Omitted fields are left unchanged, which also means an existing validTo cannot be cleared here. Status is recalculated from validTo. To change restaurant number, address or license holder, create a new assignment instead. */
export interface AssignmentUpdateRequest {
  /**
   * Last day the assignment is valid
   * @format date
   */
  validTo?: string;
  /** Name of the premises */
  premisesName?: string;
  /**
   * Name of the license holder as registered for this assignment, omit to leave it unchanged
   * @pattern .*\S.*
   */
  holderName?: string;
}

/** Assignment model, describing a restaurant number assigned to a license holder at an address */
export interface Assignment {
  /** Assignment ID */
  id?: string;
  /** The assigned restaurant number */
  restaurantNumber?: RestaurantNumber;
  /** The address the restaurant number is assigned to */
  address?: Address;
  /** The license holder the restaurant number is assigned to */
  licenseHolder?: LicenseHolder;
  /** Name of the license holder as registered for this assignment */
  holderName?: string;
  /** Name of the premises */
  premisesName?: string;
  /**
   * First day the assignment is valid
   * @format date
   */
  validFrom?: string;
  /**
   * Last day the assignment is valid, null if open ended
   * @format date
   */
  validTo?: string;
  /** Assignment status */
  status?: string;
  /**
   * Timestamp when the assignment was created
   * @format date-time
   */
  created?: string;
}

/** License holder model */
export interface LicenseHolder {
  /** License holder ID */
  id?: string;
  /** Organization number */
  orgNumber?: string;
  /** Name of the license holder */
  name?: string;
  /**
   * Timestamp when the license holder was created
   * @format date-time
   */
  created?: string;
}

/** Restaurant number model */
export interface RestaurantNumber {
  /** Restaurant number ID */
  id?: string;
  /** Restaurant number */
  number?: string;
  /** Municipality ID */
  municipalityId?: string;
  /** Whether the restaurant number has been reported to the Public Health Agency of Sweden */
  reported?: boolean;
  /**
   * Timestamp when the restaurant number was created
   * @format date-time
   */
  created?: string;
}

/** Addresses model */
export interface Addresses {
  content?: Address[];
  /** PagingMetaData model */
  _meta?: PagingMetaData;
}

/** PagingMetaData model */
export interface PagingMetaData {
  /**
   * Current page
   * @format int32
   */
  page?: number;
  /**
   * Displayed objects per page
   * @format int32
   */
  limit?: number;
  /**
   * Displayed objects on current page
   * @format int32
   */
  count?: number;
  /**
   * Total amount of hits based on provided search parameters
   * @format int64
   */
  totalRecords?: number;
  /**
   * Total amount of pages based on provided search parameters
   * @format int32
   */
  totalPages?: number;
}

/** Restaurant number at an address, with its status and the premises name and period of its current assignment. An ACTIVE number without a current assignment shows its active one, and an AVAILABLE number shows its previous one. */
export interface AddressRestaurantNumber {
  /** Restaurant number ID */
  id?: string;
  /** Restaurant number */
  number?: string;
  /** Municipality ID */
  municipalityId?: string;
  /** Whether the restaurant number has been reported to the Public Health Agency of Sweden */
  reported?: boolean;
  /** ACTIVE when the restaurant number has an active assignment, otherwise AVAILABLE */
  status?: AddressRestaurantNumberStatusEnum;
  /** Name of the premises on the shown assignment, empty when the number has never been assigned */
  premisesName?: string;
  /**
   * First day of the shown assignment
   * @format date
   */
  validFrom?: string;
  /**
   * Last day of the shown assignment, empty when it is open ended
   * @format date
   */
  validTo?: string;
  /**
   * Timestamp when the restaurant number was created
   * @format date-time
   */
  created?: string;
}

/** ACTIVE when the restaurant number has an active assignment, otherwise AVAILABLE */
export enum AddressRestaurantNumberStatusEnum {
  ACTIVE = "ACTIVE",
  AVAILABLE = "AVAILABLE",
}
