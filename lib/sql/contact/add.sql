INSERT INTO contacts("user",
                     contact_user,
                     first_name,
                     last_name,
                     phone_number,
                     email,
                     cover_image_url,
                     profile_image_url,
                     invitation_url,
                     company,
                     birthday,
                     address
                    )
VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)
ON CONFLICT DO NOTHING
RETURNING id
