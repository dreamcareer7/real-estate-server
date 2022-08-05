SELECT   
    facebook_pages.id,
    facebook_pages.facebook_credential,
    facebook_pages.name,
    facebook_pages.facebook_page_id,
    facebook_pages.instagram_business_account_id,
    facebook_pages.instagram_username,
    facebook_pages.instagram_profile_picture_url,
    facebook_pages.instagram_profile_picture_file,    
    facebook_pages.revoked,
    EXTRACT(EPOCH FROM facebook_pages.created_at) AS created_at,
    EXTRACT(EPOCH FROM facebook_pages.updated_at) AS updated_at,
    EXTRACT(EPOCH FROM facebook_pages.deleted_at) AS deleted_at,
    facebook_credentials.brand as brand,
    facebook_credentials.user as user,   
    'facebook_page' as "type"
FROM
    facebook_pages    
JOIN
    facebook_credentials
ON
    facebook_pages.facebook_credential = facebook_credentials.id    
JOIN 
    unnest($1::uuid[]) WITH ORDINALITY t(pid, ord)
ON 
    facebook_pages.id = pid
WHERE 
  facebook_pages.revoked IS FALSE
  AND facebook_pages.deleted_at IS NULL
ORDER BY 
    t.ord 