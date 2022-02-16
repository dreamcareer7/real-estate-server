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