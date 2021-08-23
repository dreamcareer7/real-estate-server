DELETE FROM
  contacts_duplicate_pairs
WHERE
  brand = $1::uuid;
