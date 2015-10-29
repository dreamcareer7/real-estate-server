INSERT INTO invitation_records(
            inviting_user,
            invited_user,
            email,
            phone_number,
            url,
            room
        )
VALUES ($1, $2, LOWER($3), $4, $5, $6) RETURNING id;
