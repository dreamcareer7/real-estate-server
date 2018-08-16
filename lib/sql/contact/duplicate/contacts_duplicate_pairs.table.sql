CREATE TABLE contacts_duplicate_pairs (
  a uuid NOT NULL,
  b uuid NOT NULL,
  "user" uuid NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  ignored_at timestamptz,
  PRIMARY KEY (a, b),
  CHECK (a < b)
);

CREATE INDEX contacts_duplicate_pairs_left_idx ON contacts_duplicate_pairs (a);
CREATE INDEX contacts_duplicate_pairs_right_idx ON contacts_duplicate_pairs (b);
CREATE INDEX contacts_duplicate_pairs_user_idx ON contacts_duplicate_pairs ("user");
