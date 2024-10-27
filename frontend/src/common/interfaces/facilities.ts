export enum AddressDtoAddressCategoryEnum {
  POSTAL_ADDRESS = 'POSTAL_ADDRESS',
  INVOICE_ADDRESS = 'INVOICE_ADDRESS',
  VISITING_ADDRESS = 'VISITING_ADDRESS',
}

export interface CoordinatesDTO {
  /**
   * Decimal Degrees (DD)
   * @format double
   * @example 62.390205
   */
  latitude?: number;
  /**
   * Decimal Degrees (DD)
   * @format double
   * @example 17.306616
   */
  longitude?: number;
}

export interface FacilityAddressDTO {
  addressCategory?: AddressDtoAddressCategoryEnum;
  /**
   * @minLength 0
   * @maxLength 255
   * @example "Testvägen"
   */
  street?: string;
  /**
   * @minLength 0
   * @maxLength 255
   * @example "18"
   */
  houseNumber?: string;
  /**
   * @minLength 0
   * @maxLength 255
   * @example "123 45"
   */
  postalCode?: string;
  /**
   * @minLength 0
   * @maxLength 255
   * @example "Sundsvall"
   */
  city?: string;
  /**
   * @minLength 0
   * @maxLength 255
   * @example "Sverige"
   */
  country?: string;
  /**
   * c/o
   * @minLength 0
   * @maxLength 255
   * @example "Test Testorsson"
   */
  careOf?: string;
  /**
   * @minLength 0
   * @maxLength 255
   * @example "Test Testorsson"
   */
  attention?: string;
  /**
   * @minLength 0
   * @maxLength 255
   * @example "SUNDSVALL LJUSTA 7:2"
   */
  propertyDesignation?: string;
  /**
   * @minLength 0
   * @maxLength 255
   * @example "LGH 1001"
   */
  apartmentNumber?: string;
  isZoningPlanArea?: boolean;
  /**
   * Only in combination with addressCategory: INVOICE_ADDRESS
   * @minLength 0
   * @maxLength 255
   */
  invoiceMarking?: string;
  location?: CoordinatesDTO;
}

export interface FacilityDTO {
  /** @format int64 */
  id?: number;
  /** @format int32 */
  version?: number;
  /** @format date-time */
  created?: string;
  /** @format date-time */
  updated?: string;
  /**
   * @minLength 0
   * @maxLength 255
   * @example "En fritextbeskrivning av facility."
   */
  description?: string;
  /** An stakeholder may have one or more addresses. For example one POSTAL_ADDRESS and another INVOICE_ADDRESS. */
  address?: FacilityAddressDTO;
  /**
   * The name on the sign.
   * @minLength 0
   * @maxLength 255
   * @example "Sundsvalls testfabrik"
   */
  facilityCollectionName?: string;
  mainFacility?: boolean;
  facilityType?: string;
  extraParameters?: Record<string, string>;
}
