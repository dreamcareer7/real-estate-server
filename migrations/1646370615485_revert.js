const db = require('../lib/utils/db')

const migrations = [
  'BEGIN',
  `CREATE OR REPLACE FUNCTION update_current_deal_context(deal_id uuid)
RETURNS void AS
$$
  BEGIN
    UPDATE current_deal_context SET deleted_at = NOW() WHERE deal = deal_id AND deleted_at IS NULL;

    WITH definitions AS (
      SELECT * FROM brands_contexts
      WHERE brand IN (SELECT brand_parents((SELECT brand FROM deals WHERE id = $1)))
    ),

    last_deal_context AS (
      SELECT
        DISTINCT ON (deal_context.deal, deal_context.key)
        deal_context.id,
        'deal_context_item'::text as type,
        deal_context.created_at,
        deal_context.created_by,
        deal_context.approved_by,
        deal_context.approved_at,
        deal_context.key,
        deal_context.text,
        deal_context.number,
        deal_context.date,
        deal_context.data_type,
        $1::uuid as deal,
        deal_context.checklist as checklist,
        'Provided'::deal_context_source as source
      FROM
        deal_context
      LEFT JOIN deals_checklists ON deal_context.checklist = deals_checklists.id

      WHERE
        deal_context.deal = $1
        AND deals_checklists.deactivated_at IS NULL
        AND deals_checklists.terminated_at  IS NULL
        AND deals_checklists.deleted_at     IS NULL
        AND deal_context.deleted_at         IS NULL
      ORDER BY
      deal_context.deal,
      deal_context.key,
      deal_context.created_at DESC
    ),

    mls_context AS (
      SELECT
        null::uuid as id,
        'deal_context_item' as type,
        NULL::timestamp with time zone as created_at,
        NULL::uuid AS created_by,
        NULL::uuid as approved_by,
        NULL::timestamp with time zone as approved_at,
        ctx.key,
        ctx.text,
        ctx.number,
        ctx.date,
        ctx.data_type,
        $1::uuid as deal,
        NULL::uuid as checklist,
        'MLS'::deal_context_source as source
      FROM get_mls_context(
        (SELECT listing FROM deals WHERE id = $1)
      ) ctx
    ),

    property_type_context AS (
      SELECT
        null::uuid as id,
        'deal_context_item' as type,
        NULL::timestamp with time zone as created_at,
        NULL::uuid AS created_by,
        NULL::uuid as approved_by,
        NULL::timestamp with time zone as approved_at,
        'property_type' as key,
        brands_property_types.label::text as text,
        null::double precision,
        null::timestamp with time zone,
        'Text'::context_data_type as data_type,
        $1::uuid as deal,
        NULL::uuid as checklist,
        'PropertyType'::deal_context_source as source
      FROM brands_property_types WHERE id = (
        (SELECT property_type FROM deals WHERE id = $1)
      )
    ),

    merged AS (
      SELECT * FROM last_deal_context
      UNION ALL
      SELECT * FROM mls_context
      UNION ALL
      SELECT * FROM property_type_context
    )

    INSERT INTO
      current_deal_context
    (SELECT DISTINCT ON(key)
      merged.*,
      definitions.id as definition,
      to_tsvector('english', COALESCE(text, number::text))
    FROM merged
    JOIN definitions ON merged.key = definitions.key
    ORDER BY
      key ASC,
      (
        CASE
          WHEN preffered_source::text = source::text THEN 1
          ELSE 2
        END
      ) ASC)

    ON CONFLICT (deal, checklist, key) DO UPDATE
    SET
      deleted_at = NULL,
      id = EXCLUDED.id,
      type = EXCLUDED.type,
      created_at = EXCLUDED.created_at,
      created_by = EXCLUDED.created_by,
      approved_by = EXCLUDED.approved_by,
      approved_at = EXCLUDED.approved_at,
      key = EXCLUDED.key,
      text = EXCLUDED.text,
      number = EXCLUDED.number,
      date = EXCLUDED.date,
      data_type = EXCLUDED.data_type,
      deal = EXCLUDED.deal,
      checklist = EXCLUDED.checklist,
      source = EXCLUDED.source,
      searchable = to_tsvector('english', COALESCE(EXCLUDED.text, EXCLUDED.number::text));

  END;
$$
LANGUAGE PLPGSQL;`,
  'SELECT update_current_deal_context(id) FROM deals',
  'COMMIT'
]


const run = async () => {
  const { conn } = await db.conn.promise()

  for(const sql of migrations) {
    await conn.query(sql)
  }

  conn.release()
}

exports.up = cb => {
  run().then(cb).catch(cb)
}

exports.down = () => {}
