export type EstateInfoSearch = {
  address: string;
  designation: string;
  objectidentifier: string;
};

export type OwnerChanges = {
  objectidentifier: string;
  acquisition: [
    {
      objectidentifier: string;
      enrollmentDay: string;
      fileNumber: string;
      decision: string;
      share: string;
      acquisitionDay: string;
      acquisitionType: string;
      registeredOwnership: string;
    }
  ];
  purchasePrice: {
    objectidentifier: string;
    purchasePriceImmovableProperty: {
      currency: string;
      sum: number;
    };
    purchasePriceType: string;
  };
  transfer: [
    {
      objectidentifier: string;
      share: string;
      registeredOwnership: string;
    }
  ];
};

export type EstateInformation = {
  district?: string;
  designation: string;
  objectidentifier: string;
  totalArea: number;
  totalAreaWater: number;
  totalAreaLand: number;
  ownerChanges: OwnerChanges[];
  ownership: [
    {
      type: string;
      objectidentifier: string;
      enrollmentDay: string;
      decision: string;
      share: string;
      versionValidFrom: string;
      owner: {
        address: string;
        city: string;
        coAddress: string;
        idnumber: string;
        name: string;
        postalCode: string;
      };
    }
  ];
  previousOwnership: [
    {
      type: string;
      objectidentifier: string;
      decision: string;
      share: string;
      diaryNumber: [string];
      versionValidFrom: string;
      owner: {
        idnumber: string;
        name: string;
      };
    }
  ];
  actions: [
    {
      actionType1: string;
      actionType2: string;
      fileDesignation: string;
      actionDate: number;
      objectidentifier: string;
      littera: string;
      runningNumber: number;
    }
  ];
};
