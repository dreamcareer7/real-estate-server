INSERT INTO google_auth_links
  ("user", brand, url, redirect, scope)
VALUES 
  ($1, $2, $3, $4, $5)
RETURNING id