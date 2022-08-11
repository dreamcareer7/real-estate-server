CREATE TABLE facebook_credentials (
    id uuid NOT NULL PRIMARY KEY DEFAULT uuid_generate_v4(),
    "user" uuid NOT NULL REFERENCES users(id),
    brand uuid NOT NULL REFERENCES brands(id),
    facebook_id TEXT NOT NULL,
    facebook_email TEXT,    
    first_name TEXT,
    last_name TEXT,
    access_token TEXT,
    scope TEXT,    
    created_at timestamp DEFAULT CLOCK_TIMESTAMP(),
    updated_at timestamp DEFAULT CLOCK_TIMESTAMP(),     
    CONSTRAINT facebook_credentials_facebook_brand UNIQUE (facebook_id, brand)    
  )