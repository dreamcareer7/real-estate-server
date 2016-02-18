SELECT id, note, 'note' AS TYPE
FROM notes
WHERE entity = $1 AND
      "user" = $2
ORDER BY note
