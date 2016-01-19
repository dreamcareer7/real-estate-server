SELECT id
FROM tasks
WHERE "user" = $1 AND
      CASE WHEN (ARRAY_LENGTH($2::text[], 1) IS NULL) THEN TRUE ELSE status::text = ANY($2::text[]) END AND
      deleted_at IS NULL
