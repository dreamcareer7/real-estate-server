UPDATE contacts
SET ios_address_book_id = (CASE WHEN $2::text IS NOT NULL THEN $2 ELSE ios_address_book_id END),
    android_address_book_id = (CASE WHEN $3::text IS NOT NULL THEN $3 ELSE android_address_book_id END)
WHERE id = $1
