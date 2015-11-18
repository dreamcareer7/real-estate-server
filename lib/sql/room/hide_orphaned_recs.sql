UPDATE recommendations
SET hidden = TRUE
WHERE COALESCE(ARRAY_LENGTH(referring_objects, 1), 0) = 0 AND
      room = $1
