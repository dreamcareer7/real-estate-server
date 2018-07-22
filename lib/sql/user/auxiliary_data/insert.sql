INSERT INTO user_auxiliary_data("user", data) 
VALUES ($1, $2)
ON CONFLICT ("user")
DO UPDATE
SET data = user_auxiliary_data.data::jsonb || $2