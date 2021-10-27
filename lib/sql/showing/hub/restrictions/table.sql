CREATE TABLE showinghub.restrictions (
  id int PRIMARY KEY,
  showable_listing uuid NOT NULL REFERENCES showinghub.showable_listings (id),

  start_date timestamp,
  end_date timestamp
)