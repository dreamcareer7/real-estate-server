SELECT tag
FROM tags
WHERE entity = $1 AND
      type = $2 AND
      "user" = $3
ORDER BY tag
