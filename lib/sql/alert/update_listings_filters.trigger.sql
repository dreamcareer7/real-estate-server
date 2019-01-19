DROP TRIGGER IF EXISTS update_listings_filters ON addresses;

CREATE TRIGGER update_listings_filters AFTER INSERT OR UPDATE OR DELETE ON addresses
  FOR EACH ROW EXECUTE PROCEDURE update_listings_filters();
