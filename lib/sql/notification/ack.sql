INSERT INTO notifications_acks(
                                "user",
                                notification
                               )
VALUES($1, $2) ON CONFLICT DO NOTHING;
