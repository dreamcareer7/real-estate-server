DROP TRIGGER IF EXISTS update_listings_filters ON listings;

CREATE TRIGGER update_listings_filters AFTER INSERT OR UPDATE OR DELETE ON listings
  FOR EACH ROW EXECUTE PROCEDURE update_listings_filters();
