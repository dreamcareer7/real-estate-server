const db = require('../lib/utils/db')

const migrations = [
  'BEGIN',


  `ALTER TABLE listings
     ADD COLUMN IF NOT EXISTS co_list_agent2_mui bigint,
     ADD COLUMN IF NOT EXISTS co_list_agent2_direct_work_phone text,
     ADD COLUMN IF NOT EXISTS co_list_agent2_email text,
     ADD COLUMN IF NOT EXISTS co_list_agent2_full_name text,
     ADD COLUMN IF NOT EXISTS co_list_agent2_mls_id text,

     ADD COLUMN IF NOT EXISTS co_list_agent3_mui bigint,
     ADD COLUMN IF NOT EXISTS co_list_agent3_direct_work_phone text,
     ADD COLUMN IF NOT EXISTS co_list_agent3_email text,
     ADD COLUMN IF NOT EXISTS co_list_agent3_full_name text,
     ADD COLUMN IF NOT EXISTS co_list_agent3_mls_id text,

     ADD COLUMN IF NOT EXISTS co_selling_agent2_mui bigint,
     ADD COLUMN IF NOT EXISTS co_selling_agent2_direct_work_phone text,
     ADD COLUMN IF NOT EXISTS co_selling_agent2_email text,
     ADD COLUMN IF NOT EXISTS co_selling_agent2_full_name text,
     ADD COLUMN IF NOT EXISTS co_selling_agent2_mls_id text,

     ADD COLUMN IF NOT EXISTS co_selling_agent3_mui bigint,
     ADD COLUMN IF NOT EXISTS co_selling_agent3_direct_work_phone text,
     ADD COLUMN IF NOT EXISTS co_selling_agent3_email text,
     ADD COLUMN IF NOT EXISTS co_selling_agent3_full_name text,
     ADD COLUMN IF NOT EXISTS co_selling_agent3_mls_id text`,


  `ALTER TABLE listings_filters
     ADD COLUMN IF NOT EXISTS co_list_agent2_mui bigint,
     ADD COLUMN IF NOT EXISTS co_list_agent2_mls_id text,

     ADD COLUMN IF NOT EXISTS co_list_agent3_mui bigint,
     ADD COLUMN IF NOT EXISTS co_list_agent3_mls_id text,

     ADD COLUMN IF NOT EXISTS co_selling_agent2_mui bigint,
     ADD COLUMN IF NOT EXISTS co_selling_agent2_mls_id text,

     ADD COLUMN IF NOT EXISTS co_selling_agent3_mui bigint,
     ADD COLUMN IF NOT EXISTS co_selling_agent3_mls_id text`,


  `CREATE INDEX IF NOT EXISTS listings_filters_co_list_agent2_mui
     ON public.listings_filters USING btree (co_list_agent2_mui)`,

  `CREATE INDEX IF NOT EXISTS listings_filters_co_list_agent3_mui
     ON public.listings_filters USING btree (co_list_agent3_mui)`,

  `CREATE INDEX IF NOT EXISTS listings_filters_co_selling_agent2_mui
     ON public.listings_filters USING btree (co_selling_agent2_mui)`,

  `CREATE INDEX IF NOT EXISTS listings_filters_co_selling_agent3_mui
     ON public.listings_filters USING btree (co_selling_agent3_mui)`,


  `CREATE OR REPLACE FUNCTION update_listings_filters()
  RETURNS trigger AS
$$
  BEGIN
    DELETE FROM listings_filters WHERE id = NEW.id;

    INSERT INTO listings_filters (
      id,
      status,
      price,
      matrix_unique_id,
      close_date,
      list_office_mls_id,
      co_list_office_mls_id,
      list_agent_mls_id,
      co_list_agent_mls_id,
      selling_office_mls_id,
      co_selling_office_mls_id,
      selling_agent_mls_id,
      co_selling_agent_mls_id,
      close_price,
      created_at,
      mls_number,
      application_fee_yn,
      mls_area_major,
      mls_area_minor,
      square_meters,
      bedroom_count,
      half_bathroom_count,
      full_bathroom_count,
      property_type,
      property_subtype,
      year_built,
      pool_yn,
      pets_yn,
      lot_square_meters,
      parking_spaces_covered_total,
      architectural_style,
      subdivision_name,
      school_district,
      elementary_school_name,
      intermediate_school_name,
      junior_high_school_name,
      middle_school_name,
      primary_school_name,
      high_school_name,
      senior_high_school_name,
      appliances_yn,
      furnished_yn,
      fenced_yard_yn,
      number_of_pets_allowed,
      location,
      county_or_parish,
      postal_code,
      address,
      mls,
      list_agent_mui,
      co_list_agent_mui,
      selling_agent_mui,
      co_selling_agent_mui,
      public_display,
      co_list_agent2_mui,
      co_list_agent2_mls_id,
      co_list_agent3_mui,
      co_list_agent3_mls_id,
      co_selling_agent2_mui,
      co_selling_agent2_mls_id,
      co_selling_agent3_mui,
      co_selling_agent3_mls_id
    )
    SELECT
      listings.id AS id,
      listings.status AS status,
      listings.price AS price,
      listings.matrix_unique_id AS matrix_unique_id,
      listings.close_date AS close_date,
      listings.list_office_mls_id,
      listings.co_list_office_mls_id,
      listings.list_agent_mls_id,
      listings.co_list_agent_mls_id,
      listings.selling_office_mls_id,
      listings.co_selling_office_mls_id,
      listings.selling_agent_mls_id,
      listings.co_selling_agent_mls_id,
      listings.close_price AS close_price,
      listings.created_at AS created_at,
      listings.mls_number,
      listings.application_fee_yn,
      -- Areas are stored as something like this: MCKINNEY AREA (53)
      -- When filteting, we only want the number (53). So we extract it.
      (SELECT regexp_matches(listings.mls_area_major, E'[0-9]+'))[1]::int AS mls_area_major,
      (SELECT regexp_matches(listings.mls_area_minor, E'[0-9]+'))[1]::int AS mls_area_minor,
      properties.square_meters,
      properties.bedroom_count,
      properties.half_bathroom_count,
      properties.full_bathroom_count,
      properties.property_type,
      properties.property_subtype,
      properties.year_built,
      properties.pool_yn,
      properties.pets_yn,
      properties.lot_square_meters,
      properties.parking_spaces_covered_total,
      properties.architectural_style,
      properties.subdivision_name,
      properties.school_district,
      properties.elementary_school_name,
      properties.intermediate_school_name,
      properties.junior_high_school_name,
      properties.middle_school_name,
      properties.primary_school_name,
      properties.high_school_name,
      properties.senior_high_school_name,
      properties.appliances_yn,
      properties.furnished_yn,
      properties.fenced_yard_yn,
      properties.number_of_pets_allowed,
      addresses.location,
      addresses.county_or_parish,
      addresses.postal_code,
      ARRAY_TO_STRING(
        ARRAY[
          addresses.title,
          addresses.subtitle,
          addresses.street_number,
          addresses.street_dir_prefix,
          addresses.street_name,
          addresses.street_suffix,
          addresses.street_dir_suffix,
          addresses.city,
          addresses.state,
          addresses.state_code,
          addresses.postal_code,
          addresses.country::text,
          addresses.country_code::text,
          (
            CASE WHEN addresses.unit_number = '' THEN NULL
            ELSE
            'Unit ' || addresses.unit_number
            END
          ),
          listings.mls_number
        ], ' ', NULL
      ) AS address,
      listings.mls AS mls,
      listings.list_agent_mui,
      listings.co_list_agent_mui,
      listings.selling_agent_mui,
      listings.co_selling_agent_mui,
      listings.public_display,
      listings.co_list_agent2_mui,
      listings.co_list_agent2_mls_id,
      listings.co_list_agent3_mui,
      listings.co_list_agent3_mls_id,
      listings.co_selling_agent2_mui,
      listings.co_selling_agent2_mls_id,
      listings.co_selling_agent3_mui,
      listings.co_selling_agent3_mls_id
    FROM listings
    JOIN properties ON listings.property_id = properties.id
    JOIN addresses ON properties.address_id = addresses.id
    WHERE listings.id = NEW.id AND listings.deleted_at IS NULL;
    RETURN NEW;
  END;
$$
LANGUAGE PLPGSQL`,


  'COMMIT',
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
