CREATE TRIGGER update_current_deal_context AFTER INSERT OR UPDATE OR DELETE ON deal_context
  FOR EACH ROW EXECUTE PROCEDURE update_current_deal_context();
