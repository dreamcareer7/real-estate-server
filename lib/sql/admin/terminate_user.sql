WITH
delete_rooms_users AS (
    DELETE FROM rooms_users WHERE "user" = $1
),
delete_notification_tokens AS (
    DELETE FROM notification_tokens WHERE "user" = $1
),
delete_notification_users AS (
    DELETE FROM notifications_users WHERE "user" = $1
),
delete_invitation_records AS (
    DELETE FROM invitation_records WHERE inviting_user = $1 OR invited_user = $1
),
delete_rec_eav AS (
    DELETE FROM recommendations_eav WHERE "user" = $1
),
delete_contacts AS (
    DELETE FROM contacts WHERE "user" = $1 OR contact_user = $1
),
delete_password_recoveries AS (
    DELETE FROM password_recovery_records WHERE "user" = $1
),
delete_messages AS (
    DELETE FROM messages WHERE author = $1
)

DELETE FROM users WHERE id = $1
