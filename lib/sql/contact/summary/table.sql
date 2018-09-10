CREATE TABLE contacts_summaries (
  id uuid PRIMARY KEY,
  created_at timestamptz,
  updated_at timestamptz,
  created_by uuid NOT NULL REFERENCES users (id),
  updated_by uuid REFERENCES users (id),
  "user" uuid NOT NULL REFERENCES users (id),
  display_name text,
  sort_field text,
  search_field tsvector,
  next_touch timestamptz,
  last_touch timestamptz,
  title text,
  first_name text,
  middle_name text,
  last_name text,
  marketing_name text,
  nickname text,
  email text[],
  phone_number text[],
  tag text[],
  website text[],
  company text,
  birthday timestamptz,
  profile_image_url text,
  cover_image_url text,
  job_title text,
  source_type text,
  stage text,
  source text
);

CREATE INDEX IF NOT EXISTS contacts_summaries_user_idx ON contacts_summaries USING hash ("user");
CREATE INDEX IF NOT EXISTS contacts_summaries_tag_idx ON contacts_summaries USING GIN (tag);
CREATE INDEX IF NOT EXISTS contacts_summaries_source_type_idx ON contacts_summaries (source_type);
CREATE INDEX IF NOT EXISTS contacts_summaries_stage_idx ON contacts_summaries (stage);
CREATE INDEX IF NOT EXISTS contacts_summaries_search_field_idx ON contacts_summaries USING GIN (search_field);
