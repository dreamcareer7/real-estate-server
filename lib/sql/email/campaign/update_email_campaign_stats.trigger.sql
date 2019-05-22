DROP TRIGGER IF EXISTS update_email_campaign_stats ON emails_events;

CREATE OR REPLACE FUNCTION update_email_campaign_stats()
RETURNS trigger AS
$$
  BEGIN
    PERFORM update_email_campaign_stats((
      SELECT DISTINCT campaign FROM emails WHERE id = NEW.email
    ));

    RETURN NEW;
  END;
$$
LANGUAGE PLPGSQL;

CREATE TRIGGER update_email_campaign_stats AFTER INSERT OR UPDATE ON emails_events
  FOR EACH ROW EXECUTE PROCEDURE update_email_campaign_stats();
