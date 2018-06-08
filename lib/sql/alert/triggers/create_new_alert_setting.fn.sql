CREATE OR REPLACE FUNCTION create_alert_setting() RETURNS trigger AS 
$$
BEGIN
  INSERT INTO user_alert_settings("user", alert, status)
  (select ru."user" as user, NEW.id as alert, ARRAY['AlertHit', 'AlertOpenHouse', 'AlertStatusChange', 'AlertPriceDrop'] as status from rooms_users ru
  inner join rooms r on(ru.room = r.id)
  inner join alerts a on (a.room = r.id)
  where a.id = NEW.id);
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;