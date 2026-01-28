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

export interface ErrorResponse {
  /** The error message. */
  error?: Error[];
}

export interface Error {
  /** The path of the error. */
  path?: string;
  /** The error code. */
  errorCode?: string;
  /** A clearification on the error. */
  message?: string;
  /** The location of the error. */
  location?: string;
}

export interface EstateDesignationResponse {
  /** The adress of the estate. */
  address?: string;
  /** The designation of the estate. */
  designation?: string;
  /** The unique identifier of the estate. */
  objectidentifier?: string;
  /** The district name of the estate. */
  districtname?: string;
  /** The district code of the estate. */
  districtcode?: string;
}

export interface EstateAddressResponse {
  /** The adress of the estate. */
  address?: string;
  /** The designation of the estate. */
  designation?: string;
  /** The unique identifier of the estate. */
  objectidentifier?: string;
  /** The district name of the estate. */
  districtname?: string;
  /** The district code of the estate. */
  districtcode?: string;
}

export interface EstateData {
  /** The designation of the estate. */
  designation?: string;
  /** The unique identifier of the estate. */
  objectidentifier?: string;
  /** The total area of the estate. */
  totalArea?: number;
  /** The total area of the estate which are over water. */
  totalAreaWater?: number;
  /** The total area of the estate which are over land. */
  totalAreaLand?: number;
  /** The current ownership of the estate. */
  ownership?: TitleDeed[];
  /** The mortages of the estate. */
  mortage?: Mortage[];
  /** The previous ownerships of the estate. */
  previousOwnership?: TitleDeed[];
  /** The changes of owning of estate. */
  ownerChanges?: OwnerChanges[];
  /** The actions performed on the estate. */
  actions?: Actions[];
}

export interface TitleDeed {
  /** Type of ownership. */
  type?: string;
  /** The unique identifier of the ownership. */
  objectidentifier?: string;
  /** The date of enrollment. */
  enrollmentDay?: string;
  /** The decision of the ownership. */
  decision?: string;
  /** The share of ownership. */
  share?: string;
  /** References to dairy. */
  diaryNumber?: string[];
  /** From when the ownership is valid. */
  versionValidFrom?: string;
  /** The owners of a estate. */
  owner?: {
    /** The id number of owner i.e. organisation number or person number. */
    idnumber?: string;
    /** The name of owner person or organisation. */
    name?: string;
    /** The c/o address of owner person or organisation. */
    coAddress?: string;
    /** The address of owner person or organisation. */
    address?: string;
    /** The postal code of owner person or organisation. */
    postalCode?: string;
    /** The postal city of owner person or organisation. */
    city?: string;
  };
}

export interface Mortage {
  /** The unique identifier of the mortage. */
  objectidentifier?: string;
  /** The type of burdens. */
  type?: string;
  /** The order of burdens on the estate. */
  priorityOrder?: number;
  /** The date of enrollment. */
  enrollmentDay?: string;
  /** The decision of the mortage. */
  decision?: string;
  /** References to dairy. */
  diaryNumber?: string[];
  /** The type of the mortage. */
  mortageType?: string;
  /** The amount of the mortage. */
  mortageAmount?: {
    /** The currency the mortage amount. */
    currency?: string;
    /** The mortage amount. */
    sum?: number;
  };
}

export interface OwnerChanges {
  /** The unique identifier of the ownership. */
  objectidentifier?: string;
  /** The acquisition. */
  acquisition?: Acquisition[];
  /** The price of the purchase. */
  purchasePrice?: {
    /** The unique identifier of the purchase price. */
    objectidentifier?: string;
    /** The price of immovable property of the estate. */
    purchasePriceImmovableProperty?: {
      /** The currency the purchase sum. */
      currency?: string;
      /** The purchase sum. */
      sum?: number;
    };
    /** The type of the purchase. */
    purchasePriceType?: string;
  };
  /** The transfer of a acquisition. */
  transfer?: Transfer[];
}

export interface Acquisition {
  /** The unique identifier of the acquisition. */
  objectidentifier?: string;
  /** The enrollment day of the acquisition. */
  enrollmentDay?: string;
  /** The decision of the acquisition. */
  decision?: string;
  /** The share of the acquisition. */
  share?: string;
  /** The day of the acquisition. */
  acquisitionDay?: string;
  /** The type of the acquisition. */
  acquisitionType?: string;
  /** The unique identifier of the registered ownership. */
  registeredOwnership?: string;
}

export interface Transfer {
  /** The unique identifier of the acquisition. */
  objectidentifier?: string;
  /** The share of the acquisition. */
  share?: string;
  /** The unique identifier of the registered ownership. */
  registeredOwnership?: string;
}

export interface Actions {
  /** The first type of an action. */
  actionType1?: string;
  /** The second type of an action. */
  actionType2?: string;
  /** The designation of the file of the action. */
  fileDesignation?: string;
  /** The date of when the action is performed. */
  actionDate?: string;
  /** The unique identifier of the action. */
  objectidentifier?: string;
  /** Reference to estate in the action. */
  littera?: string;
  /** A number showing in which order the actions is performed. */
  runningNumber?: number;
}
