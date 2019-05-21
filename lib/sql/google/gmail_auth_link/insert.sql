INSERT INTO gmail_auth_links
  ("user", brand, email, url, scope)
VALUES 
  ($1, $2, $3, $4, $5)
RETURNING id