CREATE TABLE showinghub.reocurring_restrictions (
  id int PRIMARY KEY,
  showable_listing uuid NOT NULL REFERENCES showinghub.showable_listings (id),

  day_of_week iso_day_of_week NOT NULL,
  number_of_weeks int NOT NULL,
  begin_date timestamp NOT NULL,
  start_date timestamp NOT NULL,
  end_date timestamp NOT NULL
)