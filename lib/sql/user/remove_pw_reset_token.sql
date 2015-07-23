DELETE FROM password_recovery_records
WHERE LOWER(email) = LOWER($1) AND
      token = $2
