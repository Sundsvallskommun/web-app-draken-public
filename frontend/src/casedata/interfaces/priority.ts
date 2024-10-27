export enum Priority {
  HIGH = 'Hög',
  MEDIUM = 'Medel',
  LOW = 'Låg',
}

export enum ApiPriority {
  'Hög' = 'HIGH',
  'Medel' = 'MEDIUM',
  'Låg' = 'LOW',
}

export enum All {
  ALL = 'Alla',
}

export type PriorityFilter = Priority | All;
