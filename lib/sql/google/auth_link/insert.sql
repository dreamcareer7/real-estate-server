INSERT INTO google_auth_links
  ("user", brand, url, scope)
VALUES 
  ($1, $2, $3, $4)
RETURNING id