INSERT INTO invitation_records(
            inviting_user,
            invited_user,
            email,
            room
        )
VALUES ($1, $2, LOWER($3), $4) RETURNING id;
