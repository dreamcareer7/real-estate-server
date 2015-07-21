SELECT id
FROM password_recovery_records
WHERE email = $1 AND
      token = $2 AND
      expires_at > NOW()
