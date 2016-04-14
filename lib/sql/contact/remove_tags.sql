DELETE FROM tags
WHERE entity = $1 AND
      type = 'Contact' AND
      "user" = $2
