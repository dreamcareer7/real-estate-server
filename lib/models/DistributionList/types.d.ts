export interface Distribution_list {
    id: UUID
    email: string
    caption?: string
    first_name?: string
    last_name?: string
    title?: string
    city?: string
    state?: string
    postal_code: string
    country?: string
    created_at?: number
    updated_at?: number
    deleted_at?: number
  }

  export interface Filter {
    user?: UUID
    executed?: 'true' | 'false'
    start?: number
    limit?: number
  }
  
  export interface FilterResult {
    ids: UUID[]
    total: number
  }