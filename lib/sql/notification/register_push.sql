INSERT INTO notification_tokens(
                                "user",
                                device_token
                               )
VALUES ($1, $2)
ON CONFLICT DO NOTHING;
