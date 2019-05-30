SELECT
  ba.*
FROM    get_brand_agents($1) ba
JOIN    users                 ON ba.user = users.id
WHERE
$2::text IS NULL OR (
  to_tsvector('english',
    COALESCE(users.first_name,   '') || ' ' ||
    COALESCE(users.last_name,    '') || ' ' ||
    COALESCE(users.email,        '') || ' ' ||
    COALESCE(users.phone_number, '') || ' '
  )
  @@ to_tsquery('english', $2)
)
