SELECT
  facebook_pages.id
FROM  
  facebook_pages
join
  facebook_credentials
on
  facebook_pages.facebook_credential = facebook_credentials.id
WHERE 
  facebook_credentials.user = $1
  AND facebook_credentials.brand = $2
  AND facebook_pages.revoked IS FALSE
  AND facebook_pages.deleted_at IS NULL
