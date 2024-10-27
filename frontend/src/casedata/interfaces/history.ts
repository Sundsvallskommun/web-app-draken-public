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

export interface ErrandChange {
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
    value?: string;
    leftValue?: string;
    rightValue?: string;
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

export type ErrandHistory = ErrandChange[];

export interface ParsedErrandChange extends ErrandChange {
  parsed: {
    errandId: string;
    event: { label: string; details: string };
    datetime: string;
    administrator: string;
  };
}

export type ParsedErrandHistory = ParsedErrandChange[];

export interface GenericChangeData {
  type: string;
  title: string;
  content: string;
  date: string;
}
