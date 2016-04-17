SELECT DISTINCT tag,
       *,
       'tag' AS TYPE
FROM tags
WHERE "user" = $1
