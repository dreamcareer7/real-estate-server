SELECT   
    facebook_pages.*,
    EXTRACT(EPOCH FROM facebook_pages.created_at) AS created_at,
    EXTRACT(EPOCH FROM facebook_pages.updated_at) AS updated_at,
    EXTRACT(EPOCH FROM facebook_pages.deleted_at) AS deleted_at,
    facebook_credentials.brand as brand,
    facebook_credentials.user as user,
    facebook_credentials.access_token as facebook_access_token,
    'facebook_page' as "type"
FROM
    facebook_pages    
JOIN
    facebook_credentials
ON
    facebook_pages.facebook_credential_id = facebook_credentials.id    
JOIN 
    unnest($1::uuid[]) WITH ORDINALITY t(pid, ord)
ON 
    facebook_pages.id = pid
ORDER BY 
    t.ord