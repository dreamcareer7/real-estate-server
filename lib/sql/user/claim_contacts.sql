UPDATE contacts
SET contact_user = $1
WHERE email = $2 OR
      phone_number = $3 OR
      (CASE WHEN $4::text IS NOT NULL THEN email = $4::text ELSE FALSE END) OR
      (CASE WHEN $5::text IS NOT NULL THEN phone_number = $5::text ELSE FALSE END)
