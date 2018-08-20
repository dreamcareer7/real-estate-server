-- RUN THIS ON PRODUCTION DATABASE

DROP TABLE IF EXISTS formsboer;

CREATE TABLE formsboer (
    id uuid DEFAULT uuid_generate_v1() NOT NULL,
    created_at timestamp with time zone DEFAULT clock_timestamp(),
    updated_at timestamp with time zone DEFAULT clock_timestamp(),
    deleted_at timestamp with time zone,
    formstack_id integer,
    fields json DEFAULT '{}'::json,
    name text
);

\copy formsboer from '/tmp/formsboer.csv' csv;

INSERT INTO forms(id,created_at,updated_at,deleted_at,formstack_id,fields,name)
   SELECT * FROM formsboer
   ON CONFLICT (formstack_id) DO UPDATE
      SET updated_at = EXCLUDED.updated_at,
          deleted_at = EXCLUDED.deleted_at,
          fields = EXCLUDED.fields,
          name = EXCLUDED.name;