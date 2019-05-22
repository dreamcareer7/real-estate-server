INSERT INTO gmail_auth_links
  ("user", brand, email, url, webhook, scope)
VALUES 
  ($1, $2, $3, $4, $5, $6)
RETURNING id