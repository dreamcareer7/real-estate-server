-- This is supposed to get you all agents belonging to office A
-- AND all of it's sub-offices
-- Therefore, it needs the office to be present in
-- Offices table so it's sub-offices can be considered as well

SELECT
  id
FROM agents
WHERE
  office_mlsid IN(
    SELECT mls_id FROM offices WHERE office_mls_id = (
      SELECT office_mls_id FROM offices WHERE mls_id = $1
    )
  )
ORDER BY first_name
