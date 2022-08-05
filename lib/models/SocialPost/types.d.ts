export interface Post {
  id: UUID
  brand: UUID
  created_by: UUID
  facebook_page: UUID
  template_instance?: UUID
  caption?: string
  post_link?: string
  failed_at?: number
  failure?: string
  created_at?: number
  updated_at?: number
  deleted_at?: number
  due_at?: number
  executed_at?: number
  owner: UUID
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

export interface SocialPostInsertInput {
  facebookPage: UUID
  templateInstance: UUID
  due_at: number
  caption: string
}
