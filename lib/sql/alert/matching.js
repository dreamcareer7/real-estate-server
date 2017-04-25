const squel = require('squel').useFlavour('postgres')

const HAS_OPEN_HOUSE = 'SELECT count(*) > 0 FROM open_houses WHERE listing_mui = listings_filters.matrix_unique_id AND start_time > NOW()'

const orders = {}

orders.status = (q, a) => {
  q.order('order_listings(status)')
}

orders.office = (q, a) => {
  q.order(`CASE WHEN '${a.sort_office}'::text = list_office_mls_id
    OR '${a.sort_office}'::text = co_list_office_mls_id
    OR '${a.sort_office}'::text = selling_office_mls_id
    OR '${a.sort_office}'::text = co_selling_office_mls_id
    THEN 0 ELSE 1 END`)
}

orders.close_price = (q, a) => {
  q.order('close_price', false)
}

orders.price = (q, a) => {
  q.order('price', false)
}

function addAreas (q, a) {
  if (!a.mls_areas)
    return

  const expr = squel.expr()
  q.where(expr)

  a.mls_areas.forEach(pair => {
    const cur = squel.expr()
    expr.or(cur)

    // [number, parent]

    if (pair[1] === 0) { // [11,0] All sub areas of major area 11
      cur.and('mls_area_major = ?', pair[0])
    } else {
      cur.and('mls_area_major = ?', pair[1])
      cur.and('mls_area_minor = ?', pair[0])
    }
  })
}

function addStyles (q, a) {
  const e = squel.expr()
  q.where(e)

  if (a.architectural_styles && a.architectural_styles.length > 0) {
    a.architectural_styles.forEach(style => {
      e.or('architectural_style @> ARRAY[?]', style)
    })
  }
}

function orderBy (query, a, by) {
  const parts = by.split(' ')
  const fn = parts[0]

  if (!orders[fn])
    throw new Error.Validation('Cannot sort by ' + fn)

  orders[fn](query, a)
}

module.exports = function (a) {
  const points = a.points ? Address.getGeomTextFromLocationArray(a.points) : null

  const current_year = (new Date()).getFullYear()
  if (a.maximum_year_built > current_year)
    a.maximum_year_built = current_year

  const q = squel
    .select().from('listings_filters')
    .field('id')
    .field('(COUNT(*) OVER())::INT', 'total')

  if (a.limit)
    q.limit(a.limit)

  if (a.offset)
    q.offset(a.offset)

  if (a.listing_statuses && a.listing_statuses.length > 0)
    q.where('status IN ?', a.listing_statuses)

  if (a.minimum_price)
    q.where('price >= ?', a.minimum_price)

  if (a.maximum_price)
    q.where('price <= ?', a.maximum_price)

  if (a.minimum_square_meters)
    q.where('square_meters >= ?', a.minimum_square_meters)

  if (a.maximum_square_meters)
    q.where('square_meters <= ?', a.maximum_square_meters)

  if (a.minimum_bedrooms)
    q.where('bedroom_count >= ?', a.minimum_bedrooms)

  if (a.minimum_bathrooms) // Be careful, null + 0 IS NULL
    q.where('(COALESCE(half_bathroom_count,0) + COALESCE(full_bathroom_count, 0)) >= ?', a.minimum_bathrooms)

  if (a.property_types && a.property_types.length > 0)
    q.where('property_type IN ?', a.property_types)

  if (a.property_subtypes && a.property_subtypes.length > 0)
    q.where('property_subtype IN ?', a.property_subtypes)

  if (a.minimum_year_built)
    q.where('year_built >= ?', a.minimum_year_built)

  if (a.maximum_year_built)
    q.where('year_built <= ?', a.maximum_year_built)

  if (a.pool === true)
    q.where('pool_yn = true')
  if (a.pool === false)
    q.where('pool_yn = false')

  if (a.pets === true)
    q.where('pets_yn = true')
  if (a.pets === false)
    q.where('pets_yn = false')

  if (a.minimum_lot_square_meters)
    q.where('lot_square_meters >= ?', a.minimum_lot_square_meters)

  if (a.maximum_lot_square_meters)
    q.where('lot_square_meters <= ?', a.maximum_lot_square_meters)

  if (a.minimum_parking_spaces)
    q.where('parking_spaces_covered_total >= ?', a.minimum_parking_spaces)

  if (points)
    q.where('location IS NOT NULL AND ST_Within(location, ST_SetSRID(ST_GeomFromText(?), 4326))', points)

  if (a.list_offices && a.list_offices.length > 0)
    q.where('list_office_mls_id IN ?', a.list_offices)

  if (a.selling_offices && a.selling_offices.length > 0)
    q.where('selling_office_mls_id IN ?', a.selling_offices)

  if (a.offices && a.offices.length > 0)
    q.where(`list_office_mls_id IN ?
       OR selling_office_mls_id IN ?
       OR co_list_office_mls_id IN ?
       OR co_selling_office_mls_id IN ?`,
      a.offices, a.offices, a.offices, a.offices)

  if (a.list_agents && a.list_agents.length > 0)
    q.where(`list_agent_mls_id IN ?
       OR co_list_agent_mls_id IN ?`,
       a.list_agents, a.list_agents)

  if (a.selling_agents && a.selling_agents.length > 0)
    q.where(`selling_agent_mls_id IN ?
      OR co_selling_agent_mls_id IN ?`,
      a.selling_agents, a.selling_agents)

  if (a.agents && a.agents.length > 0)
    q.where(`list_agent_mls_id   IN ?
      OR selling_agent_mls_id    IN ?
      OR co_list_agent_mls_id    IN ?
      OR co_selling_agent_mls_id IN ?`,
      a.agents, a.agents, a.agents, a.agents)

  addAreas(q, a)
  addStyles(q, a)

  if (a.open_house)
    q.where(HAS_OPEN_HOUSE)

  if (a.minimum_sold_date)
    q.where('(listings_filters.status <> \'Sold\') OR (listings_filters.close_date IS NULL) OR (close_date > to_timestamp(?::float))', a.minimum_sold_date)

  if (a.counties && a.counties.length > 0)
    q.where('county_or_parish IN ?', a.counties)

  if (a.subdivisions && a.subdivisions.length > 0)
    q.where('subdivision_name IN ?', a.subdivisions)

  if (a.school_districts && a.school_districts.length > 0)
    q.where('school_district IN ?', a.school_districts)

  if (a.primary_schools && a.primary_schools.length > 0)
    q.where('primary_school_name IN ?', a.primary_schools)

  if (a.middle_schools && a.middle_schools.length > 0)
    q.where('middle_school_name IN ?', a.middle_schools)

  if (a.elementary_schools && a.elementary_schools.length > 0)
    q.where('elementary_school_name IN ?', a.elementary_schools)

  if (a.senior_high_schools && a.senior_high_schools.length > 0)
    q.where('senior_high_school_name IN ?', a.senior_high_schools)

  if (a.junior_high_schools && a.junior_high_schools.length > 0)
    q.where('junior_high_school_name IN ?', a.junior_high_schools)

  if (a.high_schools && a.high_schools.length > 0)
    q.where('senior_high_school_name IN ? OR junior_high_school_name IN ?', a.high_schools, a.high_schools)

  if (a.intermediate_schools && a.intermediate_schools.length > 0)
    q.where('intermediate_school_name IN ?', a.intermediate_schools)

  if (a.sort_order && Array.isArray(a.sort_order))
    a.sort_order.forEach(name => orderBy(q, a, name))

  if (a.postal_codes && a.postal_codes.length > 0)
    q.where('postal_code IN ?', a.postal_codes)

  return q
}
