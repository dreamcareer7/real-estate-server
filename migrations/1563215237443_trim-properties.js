const db = require('../lib/utils/db')

const migrations = [
  'BEGIN',
  'ALTER TABLE listings DROP listing_agent_id',
  'ALTER TABLE listings DROP listing_agency_id',
  'ALTER TABLE listings DROP cover_image_url',
  'ALTER TABLE listings DROP currency',
  'ALTER TABLE listings DROP gallery_image_urls',
  'ALTER TABLE listings DROP low_price',
  'ALTER TABLE listings DROP association_type',
  'ALTER TABLE listings DROP capitalization_rate',
  'ALTER TABLE listings DROP compensation_paid',
  'ALTER TABLE listings DROP date_available',
  'ALTER TABLE listings DROP last_status',
  'ALTER TABLE listings DROP move_in_date',
  'ALTER TABLE listings DROP permit_address_internet_yn',
  'ALTER TABLE listings DROP permit_comments_reviews_yn',
  'ALTER TABLE listings DROP permit_internet_yn',
  'ALTER TABLE listings DROP price_change_timestamp',
  'ALTER TABLE listings DROP property_association_fees',
  'ALTER TABLE listings DROP special_notes',
  'ALTER TABLE listings DROP total_annual_expenses_include',
  'ALTER TABLE listings DROP transaction_type',
  'ALTER TABLE listings DROP virtual_tour_url_branded',
  'ALTER TABLE listings DROP virtual_tour_url_unbranded',
  'ALTER TABLE listings DROP active_option_contract_date',
  'ALTER TABLE listings DROP back_on_market_date',
  'ALTER TABLE listings DROP deposit_amount',
  'ALTER TABLE listings DROP photo_count',
  'ALTER TABLE listings DROP owner_name',
  'ALTER TABLE listings DROP seller_type',
  'ALTER TABLE listings DROP alerting_agent_id',

  'ALTER TABLE properties DROP accessibility_features',
  'ALTER TABLE properties DROP commercial_features',
  'ALTER TABLE properties DROP community_features',
  'ALTER TABLE properties DROP energysaving_features',
  'ALTER TABLE properties DROP farmranch_features',
  'ALTER TABLE properties DROP bedroom_bathroom_features',
  'ALTER TABLE properties DROP structural_style',
  'ALTER TABLE properties DROP parking_spaces_carport',
  'ALTER TABLE properties DROP parking_spaces_garage',
  'ALTER TABLE properties DROP construction_materials_walls',
  'ALTER TABLE properties DROP building_number',
  'ALTER TABLE properties DROP ceiling_height',
  'ALTER TABLE properties DROP map_coordinates',
  'ALTER TABLE properties DROP photo_count',
  'ALTER TABLE properties DROP room_count',
  'ALTER TABLE properties DROP subdivided_yn',
  'ALTER TABLE properties DROP surface_rights',
  'ALTER TABLE properties DROP unit_count',
  'ALTER TABLE properties DROP year_built_details',
  'ALTER TABLE properties DROP zoning',
  'ALTER TABLE properties DROP security_system_yn',
  'ALTER TABLE properties DROP building_square_meters',
  'ALTER TABLE properties DROP number_of_stories_in_building',

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
