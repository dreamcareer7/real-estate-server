SELECT id
FROM notifications
WHERE notified_user = $1 AND
      CASE WHEN $2 = TRUE THEN READ = TRUE
      ELSE READ = FALSE
END
