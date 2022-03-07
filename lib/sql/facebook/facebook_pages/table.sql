CREATE TABLE facebook_pages (
    id uuid NOT NULL PRIMARY KEY DEFAULT uuid_generate_v4(),
    facebook_credential uuid NOT NULL REFERENCES facebook_credentials(id),    
    access_token TEXT,
    name TEXT,
    facebook_page_id TEXT NOT NULL,
    instagram_business_account_id TEXT NOT NULL, 
    instagram_username TEXT,         
    instagram_profile_picture_url TEXT,
    created_at timestamp DEFAULT CLOCK_TIMESTAMP(),
    updated_at timestamp DEFAULT CLOCK_TIMESTAMP(),
    deleted_at timestamp,
    revoked boolean NOT NULL DEFAULT false,     
    CONSTRAINT facebook_pages_facebook_instagram UNIQUE (facebook_credential, instagram_business_account_id)             
  )