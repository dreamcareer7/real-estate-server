SELECT DISTINCT
  brand AS id
FROM
  unnest($1::uuid[]) AS cids(id)
  JOIN contacts USING (id)
WHERE
  deleted_at IS NULL

UNION

SELECT DISTINCT
  brand As id
FROM
  contacts_roles
WHERE
  deleted_at IS NULL AND
  role IN ('assignee', 'owner') AND
  contact = ANY($1::uuid[])
