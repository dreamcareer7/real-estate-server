WITH
delete_rooms_users AS (
    DELETE FROM rooms_users WHERE "user" = $1
),
delete_notification_tokens AS (
    DELETE FROM notification_tokens WHERE "user" = $1
),
delete_notification_acks AS (
    DELETE FROM notifications_acks WHERE "user" = $1
),
delete_inviting_records AS (
    DELETE FROM invitation_records WHERE invited_user = $1
),
delete_invited_records AS (
    DELETE FROM invitation_records WHERE inviting_user = $1
),
delete_rec_eav AS (
    DELETE FROM recommendations_eav WHERE "user" = $1
)

DELETE FROM users WHERE id = $1
