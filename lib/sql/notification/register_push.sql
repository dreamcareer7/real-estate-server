WITH remove_dups AS (
    DELETE FROM notification_tokens
    WHERE device_token = $2
)
INSERT INTO notification_tokens(
                                "user",
                                device_token
                               )
VALUES ($1, $2)
