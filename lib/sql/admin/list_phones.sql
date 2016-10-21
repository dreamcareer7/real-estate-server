SELECT 'user' AS type,
       id,
       first_name,
       last_name,
       email,
       phone_number,
       is_shadow,
       fake_email,
       phone_confirmed,
       email_confirmed
FROM users
WHERE phone_number IS NOT NULL
ORDER BY email ASC
