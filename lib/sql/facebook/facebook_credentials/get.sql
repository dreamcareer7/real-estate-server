SELECT   
    facebook_credentials.*,
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