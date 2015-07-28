SELECT id
FROM password_recovery_records
WHERE LOWER(email) = LOWER($1) AND
      token = $2 AND
      expires_at > NOW()
ORDER BY created_at DESC
