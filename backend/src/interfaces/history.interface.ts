interface OwnerId {
  entity: string;
  cdoId: number;
}

interface Value {
  cdoId: number;
  entity: string;
  valueObject: string;
  fragment: string;
  ownerId: OwnerId;
}

type GlobalId = Value;

interface Change {
  changeType: string;
  commitMetadata: {
    author: string;
    properties: { [key: string]: any }[];
    commitDate: string;
    commitDateInstant: string;
    id: number;
  };
  globalId: GlobalId;
  property: string;
  propertyChangeType: string;
  entryChanges: {
    entryChangeType: string;
    value: string;
    key: string;
  }[];
  left: string;
  right: string;
  elementChanges: {
    index: number;
    elementChangeType: string;
    value: Value;
  }[];
}

export type History = Change[];
