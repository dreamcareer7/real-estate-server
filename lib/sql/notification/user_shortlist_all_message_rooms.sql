SELECT id
FROM notifications
WHERE notified_user = $1 AND
      shortlist = $2 AND
      object_class = 'MessageRoom' AND
      CASE WHEN $3 = TRUE THEN READ = TRUE
      ELSE READ = FALSE
END
