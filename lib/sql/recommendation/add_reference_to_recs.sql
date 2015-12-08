UPDATE recommendations
SET referring_objects = ARRAY_APPEND(referring_objects, $3)
WHERE room = $1 AND
      listing = $2 AND
      NOT ($3 = ANY(referring_objects));
