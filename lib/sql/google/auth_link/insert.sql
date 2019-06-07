INSERT INTO google_auth_links
  (key, "user", brand, url, webhook, redirect, scope)
VALUES 
  ($1, $2, $3, $4, $5, $6, $7)
RETURNING id