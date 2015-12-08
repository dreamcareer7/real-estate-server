INSERT INTO invitation_records(
            inviting_user,
            invited_user,
            email,
            phone_number,
            invitee_first_name,
            invitee_last_name,
            url,
            room
        )
VALUES ($1, $2, LOWER($3), $4, $5, $6, $7, $8)
ON CONFLICT DO NOTHING
RETURNING id;
