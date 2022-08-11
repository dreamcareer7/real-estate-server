-- This is supposed to get you all agents belonging to office A
-- AND all of it's sub-offices
-- Therefore, it needs the office to be present in
-- Offices table so it's sub-offices can be considered as well
WITH selected_offices AS (
  SELECT office_mls_id, mls_id, mls
  FROM offices WHERE mls=$2 AND mls_id=$1
)
SELECT
  agents.id
FROM agents INNER JOIN offices ON 
  offices.office_mls_id IN (SELECT office_mls_id FROM selected_offices) AND
  agents.office_mlsid=offices.mls_id AND
  agents.mls = $2
GROUP BY agents.id
ORDER BY first_name
