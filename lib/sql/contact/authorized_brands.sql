SELECT DISTINCT
  brand AS id
FROM
  unnest($1::uuid[]) AS cids(id)
  JOIN contacts USING (id)
