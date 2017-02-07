CREATE OR REPLACE FUNCTION wipe_everything() RETURNS VOID AS $$
BEGIN
    TRUNCATE TABLE messages_acks CASCADE;
    TRUNCATE TABLE messages CASCADE;
    TRUNCATE TABLE notifications_acks CASCADE;
    TRUNCATE TABLE notifications CASCADE;
    TRUNCATE TABLE notifications_deliveries;
    TRUNCATE TABLE notifications_users;
    TRUNCATE TABLE recommendations_eav CASCADE;
    TRUNCATE TABLE recommendations CASCADE;
    TRUNCATE TABLE rooms_users CASCADE;
    TRUNCATE TABLE rooms CASCADE;
    TRUNCATE TABLE invitation_records CASCADE;
    TRUNCATE TABLE alerts CASCADE;
    TRUNCATE TABLE contacts CASCADE;
    TRUNCATE TABLE notification_tokens CASCADE;
    TRUNCATE TABLE password_recovery_records CASCADE;
    TRUNCATE TABLE email_verifications CASCADE;
    TRUNCATE TABLE phone_verifications CASCADE;
    TRUNCATE TABLE attachments_eav CASCADE;
    TRUNCATE TABLE attachments CASCADE;
    TRUNCATE TABLE notes CASCADE;
    TRUNCATE TABLE cmas CASCADE;
    TRUNCATE TABLE sessions CASCADE;
    TRUNCATE TABLE tags CASCADE;
    TRUNCATE TABLE tags_contacts CASCADE;
END;
$$ LANGUAGE plpgsql;
