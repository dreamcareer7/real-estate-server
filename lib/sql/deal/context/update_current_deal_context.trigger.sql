DROP TRIGGER IF EXISTS update_current_deal_context ON deal_context;
DROP TRIGGER IF EXISTS update_current_deal_context ON deals_checklists;
DROP TRIGGER IF EXISTS update_current_deal_context ON addresses;
DROP TRIGGER IF EXISTS update_current_deal_context ON addresses;

CREATE OR REPLACE FUNCTION update_current_deal_context_from_mls_trigger()
RETURNS trigger AS
$$
  BEGIN
    PERFORM update_current_deal_context(id) FROM deals
    WHERE listing = (SELECT id FROM listings WHERE matrix_unique_id = NEW.matrix_unique_id);

    RETURN NEW;
  END;
$$
LANGUAGE PLPGSQL;

CREATE OR REPLACE FUNCTION update_current_deal_context_trigger()
RETURNS trigger AS
$$
  BEGIN
    PERFORM update_current_deal_context(NEW.deal);

    RETURN NEW;
  END;
$$
LANGUAGE PLPGSQL;

CREATE OR REPLACE FUNCTION deals_updated_current_deal_context_trigger()
RETURNS trigger AS
$$
  BEGIN
    PERFORM update_current_deal_context(NEW.id);

    RETURN NEW;
  END;
$$
LANGUAGE PLPGSQL;

CREATE TRIGGER update_current_deal_context AFTER INSERT OR UPDATE ON deal_context
  FOR EACH ROW EXECUTE PROCEDURE update_current_deal_context_trigger();

CREATE TRIGGER update_current_deal_context AFTER INSERT OR UPDATE ON deals_checklists
  FOR EACH ROW EXECUTE PROCEDURE update_current_deal_context_trigger();

CREATE TRIGGER update_current_deal_context AFTER INSERT OR UPDATE on addresses
  FOR EACH ROW EXECUTE PROCEDURE update_current_deal_context_from_mls_trigger();

CREATE TRIGGER update_current_deal_context AFTER INSERT OR UPDATE on deals
  FOR EACH ROW EXECUTE PROCEDURE deals_updated_current_deal_context_trigger();
