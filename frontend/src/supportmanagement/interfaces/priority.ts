export enum Priority {
  HIGH = 'Hög',
  MEDIUM = 'Medel',
  LOW = 'Låg',
}

export enum All {
  ALL = 'Alla',
}

export type PriorityFilter = Priority | All;
