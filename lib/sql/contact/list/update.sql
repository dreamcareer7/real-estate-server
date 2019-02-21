WITH filters AS (
  SELECT
    id,
    attribute_def,
    COALESCE(operator, 'eq') AS operator,
    "value",
    COALESCE(invert, FALSE) AS invert
  FROM
    json_populate_recordset(null::crm_lists_filters, $7::json) AS filters
), f_upd AS (
  UPDATE
    crm_lists_filters AS clf
  SET
    attribute_def = f.attribute_def,
    operator = f.operator,
    value = f.value,
    invert = f.invert
  FROM
    filters AS f
  WHERE
    clf.id = f.id
    AND clf.crm_list = $1::uuid
  RETURNING
    1
), f_ins AS (
  INSERT INTO
    crm_lists_filters(crm_list, attribute_def, operator, "value", invert)
  SELECT
    $1::uuid AS crm_list, attribute_def, operator, "value", invert
  FROM
    filters
  WHERE
    id IS NULL
  RETURNING
    1
), f_dlt AS (
  DELETE FROM
    crm_lists_filters
  WHERE
    id NOT IN (
      SELECT
        id
      FROM
        filters
      WHERE
        id IS NOT NULL
    )
    AND crm_list = $1
  RETURNING
    1
), upd AS (
  UPDATE
    crm_lists
  SET
    name = $3,
    touch_freq = $4,
    is_and_filter = $5,
    query = $6,
    updated_at = clock_timestamp(),
    updated_by = $2::uuid
  WHERE
    id = $1
  RETURNING
    1
)
SELECT
  *
FROM
  f_upd, f_ins, f_dlt, upd
