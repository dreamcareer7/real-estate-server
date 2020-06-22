
CREATE OR REPLACE FUNCTION update_deal_room_titles(deal_id uuid)
RETURNS void
LANGUAGE SQL
AS
$$
  UPDATE rooms SET title = deals.title || ': ' || tasks.title
    FROM deals
    JOIN deals_checklists dc ON deals.id = dc.deal
    JOIN tasks ON dc.id = tasks.checklist
    WHERE rooms.id = tasks.room AND deals.id = $1;
$$;

DROP TRIGGER IF EXISTS update_deal_room_titles_trigger ON deals;

CREATE OR REPLACE FUNCTION update_deal_room_titles_trigger()
RETURNS trigger AS
$$
  BEGIN
    PERFORM update_deal_room_titles(deals.id) FROM deals WHERE id = NEW.id;

    RETURN NEW;
  END;
$$
LANGUAGE PLPGSQL;

CREATE TRIGGER update_deal_room_titles_trigger AFTER UPDATE on deals
  FOR EACH ROW EXECUTE PROCEDURE update_deal_room_titles_trigger();
