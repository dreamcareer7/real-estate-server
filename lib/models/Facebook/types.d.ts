export interface FacebookPage {
  access_token: string;
  category: string;
  name: string;
  id: string;
}

export interface InstagramProfile {
  profile_picture_url?: string;
  biography?: string;
  id: string;
  username: string;
  website?: string;
}

export interface FacebookProfile {
  id: string;
  first_name: string;
  last_name: string;
  email: string
  picture?: {
    data?: {
      height: number;
      is_silhouette: boolean;
      url: string;
      width: string
    }
  }
}

export interface FacebookCredential {
  id: UUID;
  user: UUID
  brand: UUID
  facebook_id: string
  facebook_email: string
  first_name: string
  last_name: string
  scope: string
  access_token: string
  created_at: number
  updated_at: number
  type: string
}

export interface DBFacebookPage {
  id: UUID
  facebook_credential: UUID
  name: string
  facebook_page_id: string
  instagram_business_account_id: string
  instagram_username: string
  instagram_profile_picture_url: string
  instagram_profile_picture_file: UUID
  revoked: boolean
  created_at: number
  updated_at: number
  type: string
  brand: UUID
  user: UUID
}