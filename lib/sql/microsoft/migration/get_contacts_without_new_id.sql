SELECT 
	DISTINCT microsoft_credential as cid,
	microsoft_contacts.id,
	microsoft_contacts.remote_id
	
FROM 
  microsoft_contacts 

JOIN 
  microsoft_credentials 
	ON microsoft_credential = microsoft_credentials."id"
	
WHERE 
  new_remote_id IS NULL AND
	microsoft_contacts.source = 'contacts' AND
	microsoft_credentials.deleted_at IS NULL AND
	microsoft_credentials.revoked = FALSE
	
LIMIT 1000