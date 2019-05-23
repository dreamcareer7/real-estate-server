INSERT INTO google_auth_links
  (key, "user", brand, email, url, webhook, scope)
VALUES 
  ($1, $2, $3, $4, $5, $6, $7)
RETURNING id