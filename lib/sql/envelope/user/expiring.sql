SELECT * FROM docusign_users WHERE updated_at <= (NOW() - '20 day'::interval)
