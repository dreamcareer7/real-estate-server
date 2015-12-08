UPDATE contacts
SET contact_user = $1,
    first_name = $2,
    last_name = $3,
    phone_number = $4,
    email = $5,
    cover_image_url = $6,
    profile_image_url = $7,
    invitation_url = $8,
    company = $9,
    birthday = TIMESTAMP WITH TIME ZONE 'EPOCH' + $10 * INTERVAL '1 SECOND',
    address = $11,
    updated_at = NOW()
WHERE id = $12
