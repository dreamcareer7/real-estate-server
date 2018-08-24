CREATE OR REPLACE FUNCTION delete_alert_setting() RETURNS TRIGGER AS $$
	BEGIN
		DELETE FROM user_alert_settings
		WHERE "user" = OLD."user" AND
		alert = (select id from alerts where room = OLD.room);

		RETURN OLD;
	END;
$$ LANGUAGE plpgsql;
