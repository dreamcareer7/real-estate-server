UPDATE contacts
SET contact_user = $1
WHERE lower(email) = lower($2) OR
      (CASE WHEN $3::text IS NOT NULL THEN phone_number = $3::text ELSE FALSE END) OR
      (CASE WHEN $4::text IS NOT NULL THEN lower(email) = lower($4::text) ELSE FALSE END) OR
      (CASE WHEN $5::text IS NOT NULL THEN phone_number = $5::text ELSE FALSE END)
