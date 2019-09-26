INSERT INTO recommendations_eav(
                                "user",
                                recommendation,
                                action
                               )
VALUES($1, $2, 'Hid'::recommendation_eav_action)
ON CONFLICT DO NOTHING;
