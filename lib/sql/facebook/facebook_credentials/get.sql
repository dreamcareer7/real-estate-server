SELECT   
    facebook_credentials.id,
    facebook_credentials.user,
    facebook_credentials.brand,
    facebook_credentials.facebook_id,
    facebook_credentials.facebook_email,
    facebook_credentials.first_name,
    facebook_credentials.last_name,
    facebook_credentials.access_token,
    facebook_credentials.scope,
    facebook_credentials.access_token,
    EXTRACT(EPOCH FROM facebook_credentials.created_at) AS created_at,
    EXTRACT(EPOCH FROM facebook_credentials.updated_at) AS updated_at,    
    'facebook_credential' as "type"
FROM
    facebook_credentials      
JOIN 
    unnest($1::uuid[]) WITH ORDINALITY t(pid, ord)
ON 
    facebook_credentials.id = pid
ORDER BY 
    t.ord