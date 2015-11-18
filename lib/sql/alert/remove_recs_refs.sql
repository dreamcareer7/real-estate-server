UPDATE recommendations
SET referring_objects = ARRAY_REMOVE(referring_objects, $1)
WHERE room = $2 AND
      ($1 = ANY(referring_objects))
