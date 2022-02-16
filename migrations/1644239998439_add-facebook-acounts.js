const db = require('../lib/utils/db')

const migrations = [
  'BEGIN',
  `CREATE TABLE facebook_credentials (
    id uuid NOT NULL PRIMARY KEY DEFAULT uuid_generate_v4(),
    "user" uuid NOT NULL REFERENCES users(id),
    brand uuid NOT NULL REFERENCES brands(id),
    facebook_id TEXT NOT NULL,
    facebook_email TEXT,    
    first_name TEXT,
    last_name TEXT,
    access_token TEXT,
    scope TEXT,    
    created_at timestamp with time zone DEFAULT CLOCK_TIMESTAMP(),
    updated_at timestamp with time zone DEFAULT CLOCK_TIMESTAMP(),     
    CONSTRAINT facebook_credentials_facebook_brand UNIQUE (facebook_id, brand)    
  )`,
  `CREATE TABLE facebook_pages (
    id uuid NOT NULL PRIMARY KEY DEFAULT uuid_generate_v4(),
    facebook_credential_id uuid NOT NULL REFERENCES facebook_credentials(id),    
    access_token TEXT,
    name TEXT,
    facebook_page_id TEXT NOT NULL,
    instagram_business_account_id TEXT NOT NULL, 
    instagram_username TEXT,         
    instagram_profile_picture_url TEXT,
    created_at timestamp with time zone DEFAULT CLOCK_TIMESTAMP(),
    updated_at timestamp with time zone DEFAULT CLOCK_TIMESTAMP(),
    deleted_at timestamp with time zone,
    revoked boolean NOT NULL DEFAULT false,     
    CONSTRAINT facebook_pages_facebook_instagram UNIQUE (facebook_credential_id, instagram_business_account_id)             
  )`,
  'COMMIT'
]


const run = async () => {
  const { conn } = await db.conn.promise()

  for(const sql of migrations) {
    await conn.query(sql)
  }

  conn.release()
}

exports.up = cb => {
  run().then(cb).catch(cb)
}

exports.down = () => {}
