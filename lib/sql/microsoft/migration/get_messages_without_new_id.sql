SELECT 
	DISTINCT microsoft_credential as cid,
	microsoft_messages.id,
	microsoft_messages.message_id
	
FROM 
  	microsoft_messages 

JOIN 
  	microsoft_credentials 
	ON microsoft_credential = microsoft_credentials."id"
	
WHERE 
  	new_message_id IS NULL AND
	microsoft_credentials.deleted_at IS NULL AND
	microsoft_credentials.revoked = FALSE
	
LIMIT 1000