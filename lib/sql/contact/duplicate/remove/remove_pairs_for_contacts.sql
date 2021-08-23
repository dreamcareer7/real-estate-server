DELETE FROM
  contacts_duplicate_pairs
WHERE
  a = ANY($1::uuid[])
  OR b = ANY($1::uuid[]);
