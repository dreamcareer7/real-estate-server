DELETE FROM tags
WHERE entity = $1 AND
      tag = $2 AND
      "user" = $3 AND
      type = 'Contact'
