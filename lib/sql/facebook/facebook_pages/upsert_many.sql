with items as (
  select * from json_to_recordset($2) AS t(
    access_token text,
    name text,
    facebook_page_id text,
    instagram_business_account_id text,
    instagram_username text,
    instagram_profile_picture_url text,
    instagram_profile_picture_file uuid
  )
),
upsert as (
 INSERT INTO
  facebook_pages (
    facebook_credential,
    access_token,
    name,
    facebook_page_id,
    instagram_business_account_id,
    instagram_username,
    instagram_profile_picture_url,
    instagram_profile_picture_file    
  )
  SELECT
    $1::uuid,
    access_token,
    name,
    facebook_page_id,
    instagram_business_account_id,
    instagram_username,
    instagram_profile_picture_url,
    instagram_profile_picture_file
  FROM items
  ON CONFLICT(facebook_credential, instagram_business_account_id) do update set 
  access_token = excluded.access_token,
  name = excluded.name,
  instagram_username = excluded.instagram_username,
  facebook_page_id = excluded.facebook_page_id,
  revoked = false,
  deleted_at = null,
  instagram_profile_picture_url = excluded.instagram_profile_picture_url,
  instagram_profile_picture_file = excluded.instagram_profile_picture_file
  RETURNING id 
)
update facebook_pages
  set 
    deleted_at = CLOCK_TIMESTAMP(),
    revoked = true
  where facebook_credential = $1::uuid
  and instagram_business_account_id not in (
    select instagram_business_account_id from items
  )