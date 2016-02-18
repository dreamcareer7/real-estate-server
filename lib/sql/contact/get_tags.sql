SELECT tag
FROM tags
WHERE entity = $1 AND
      type = $2
ORDER BY tag
