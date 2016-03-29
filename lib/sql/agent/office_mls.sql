SELECT
  id
FROM agents
WHERE
  office_mlsid IN(
    SELECT mls_id FROM offices WHERE office_mls_id = $1
  )
ORDER BY first_name