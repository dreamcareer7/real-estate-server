DELETE FROM recommendations_eav
WHERE "user" = $1 AND
      recommendation = $2 AND
      action = 'Read';
