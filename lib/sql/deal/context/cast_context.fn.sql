CREATE OR REPLACE FUNCTION cast_context(value anyelement, condition_type TEXT, data_type text) RETURNS anyelement AS $$
BEGIN
    IF condition_type = 'Text' AND data_type = 'TEXT'   THEN
      RETURN value::text;
    END IF;

    IF condition_type = 'Number' AND data_type = 'Number' THEN
      RETURN value::float;
    END IF;

    IF condition_type = 'Date' AND data_type = 'Date' THEN
      RETURN value::timestamp with time zone;
    END IF;

    RETURN NULL;
END;
$$ LANGUAGE plpgsql;
