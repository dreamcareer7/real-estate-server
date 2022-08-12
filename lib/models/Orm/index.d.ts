export interface TPopulateOptions<TModel, TAssociation, TFormat extends 'nested' | 'references'> {
  models: TModel[];
  associations?: TAssociation[];
  format: TFormat;
  stash?: unknown;
}

export interface TPopulateOptionsSimple<TModel, TAssociation> {
  models: TModel[];
  associations?: TAssociation[];
}

export type OrmAssociationDefinition<I = unknown, T = unknown> = {
  optional?: boolean;
  enabled?: boolean;
} & (
  | {
    polymorphic: true;
    collection: boolean;
  }
  | {
    polymorphic?: false;
    collection?: false;
    default_value?: { model: string; id: I };
    id?: (m: T, cb: (err?: unknown, id?: I) => void) => void;
    model: string | ((m: T, cb: (err?: unknown, model_name?: string | undefined) => void) => void);
  }
  | {
    polymorphic?: false;
    collection: true;
    default_value?: { model: string; id: I }[];
    ids?: (m: T, cb: (err?: unknown, ids?: I[]) => void) => void;
    model: string | ((m: T, cb: (err?: unknown, model_name?: string | undefined) => void) => void);
  }
)

export interface OrmModelDefinition<I = unknown, T = unknown> {
  getAll?: ((ids: I[]) => Promise<T[]>) | ((ids: I[], cb: (err: unknown, models: T[]) => void) => void);
  associations?: Record<string, OrmAssociationDefinition<I, T>>;
  publicize?(m: T): unknown;
}

export function populate<TModel, TAssociation, TPopulated>(options: TPopulateOptions<TModel, TAssociation, 'nested'>): Promise<TPopulated[]>;
export function populate<TModel, TAssociation, TPopulated>(options: TPopulateOptionsSimple<TModel, TAssociation>): Promise<TPopulated[]>;
export function populate<TModel, TAssociation extends string>(options: TPopulateOptions<TModel, TAssociation, 'references'>): Promise<{ references: Record<TAssociation, unknown>; data: any; }>;
