CREATE TABLE brands_mls (
  id serial PRIMARY KEY,
  brand uuid NOT NULL REFERENCES brands (id),
  mls mls NOT NULL,

  UNIQUE (brand, mls)
)
