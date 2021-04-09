export interface TPopulateOptions<TModel, TAssociation, TFormat extends 'nested' | 'references' = 'nested'> {
  models: TModel[];
  associations?: TAssociation[];
  format: TFormat;
  stash?: unknown;
}

export interface TPopulateOptionsSimple<TModel, TAssociation> {
  models: TModel[];
  associations?: TAssociation[];
}

export function populate<TModel, TAssociation, TPopulated>(options: TPopulateOptions<TModel, TAssociation, 'nested'>): Promise<TPopulated[]>;
export function populate<TModel, TAssociation, TPopulated>(options: TPopulateOptionsSimple<TModel, TAssociation>): Promise<TPopulated[]>;
export function populate<TModel, TAssociation extends string>(options: TPopulateOptions<TModel, TAssociation, 'references'>): Promise<{ references: Record<TAssociation, unknown>; data: any; }>;