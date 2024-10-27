export interface Address {
  addressCategory: 'POSTAL_ADDRESS';
  street: string;
  apartmentNumber?: '';
  postalCode: string;
  city: string;
  careOf: string;
}
