DROP TRIGGER IF EXISTS update_current_deal_context ON deal_context;
DROP TRIGGER IF EXISTS update_current_deal_context ON deals_checklists;

CREATE TRIGGER update_current_deal_context AFTER INSERT OR UPDATE OR DELETE ON deal_context
  FOR EACH ROW EXECUTE PROCEDURE update_current_deal_context();

CREATE TRIGGER update_current_deal_context AFTER INSERT OR UPDATE OR DELETE ON deals_checklists
  FOR EACH ROW EXECUTE PROCEDURE update_current_deal_context();
