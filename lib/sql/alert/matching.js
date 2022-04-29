const squel = require('@rechat/squel').useFlavour('postgres')
const Context = require('../../models/Context')
const tsquery = require('../../utils/tsquery')

const { getGeomTextFromLocationArray } = require('../../models/Address/get')

const HAS_OPEN_HOUSE = `
  SELECT count(*) > 0
  FROM open_houses
  WHERE      open_houses.listing_mui = listings_filters.matrix_unique_id
        AND  open_houses.mls              = listings_filters.mls
  AND   end_time::timestamptz AT TIME ZONE tz > NOW()
`

const MASTER_BEDROOM_IN_FIRST_FLOOR = `
  SELECT count(*) > 0
  FROM   property_rooms
  WHERE  room_type = 'Master Bedroom' AND level = 1
  AND    property_rooms.listing_mui = listings_filters.matrix_unique_id
  AND    property_rooms.mls = listings_filters.mls`


const orders = {}

orders.status = (q, a) => {
  q.order('order_listings(listings_filters.status)')
}

orders.office = (q, a) => {
  q.order(`CASE WHEN '${a.sort_office}'::text = list_office_mls_id
    OR '${a.sort_office}'::text = co_list_office_mls_id
    OR '${a.sort_office}'::text = selling_office_mls_id
    OR '${a.sort_office}'::text = co_selling_office_mls_id
    THEN 0 ELSE 1 END`)
}

orders.close_price = (q, a) => {
  q.order('close_price', a.order_dir)
}

orders.price = (q, a) => {
  q.order('price', a.order_dir)
}

orders.mls = (q, a) => {
  q.order('listings_filters.mls IN ?', true, a.mls)
}

orders.list_date = (q, a) => {
  q.orderNullsLast('list_date', a.order_dir)
}

orders.bedrooms = (q, a) => {
  q.orderNullsLast('bedroom_count', a.order_dir)
}

orders.bathrooms = (q, a) => {
  q.orderNullsLast('bathroom_count', a.order_dir)
}

orders.square_feet = (q, a) => {
  q.orderNullsLast('square_meters', a.order_dir)
}

orders.lot_size = (q, a) => {
  q.orderNullsLast('lot_size_area', a.order_dir)
}

orders.year_built = (q, a) => {
  q.orderNullsLast('year_built', a.order_dir)
}

function addAreas(q, a) {
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

function addStyles(q, a) {
  const e = squel.expr()
  q.where(e)

  if (a.architectural_styles && a.architectural_styles.length > 0) {
    a.architectural_styles.forEach(style => {
      e.or('architectural_style @> ARRAY[?]', style)
    })
  }
}

const addBrand = (q, a) => {
  const expr = squel.rstr('get_brand_agents(?)', a.brand)

  const condition = `listings_filters.mls = brand_agents.mls
  AND brand_agents.enabled IS TRUE
  AND brand_agents.mui IN(
    list_agent_mui,
    co_list_agent_mui,
    selling_agent_mui,
    co_selling_agent_mui
  )`

  q.join(expr, 'brand_agents', condition)
}

const addSearch = (q, a) => {
  const expr = squel.rstr('search_listings(to_tsquery(\'english\', ?))', tsquery(a.search))

  const condition = 'listings_filters.id = search_results.id'

  q.join(expr, 'search_results', condition)
}


function orderBy(query, a, by) {
  const parts = by.split(' ')
  let fn = parts[0]

  if (fn.indexOf('-') !== -1) a.order_dir = false
  if (fn.indexOf('+') !== -1) a.order_dir = true

  fn = fn.toLowerCase()
  fn = fn.replace(/[^a-z]/, '')
  if (!orders[fn])
    throw new Error.Validation('Cannot sort by ' + fn)

  orders[fn](query, a)
}


module.exports = function (a) {
  const points = a.points ? getGeomTextFromLocationArray(a.points) : null

  const current_year = (new Date()).getFullYear()
  if (a.maximum_year_built > current_year)
    a.maximum_year_built = current_year

  const q = squel
    .select().from('listings_filters')
    .field('listings_filters.id')
    .field('(COUNT(*) OVER())::INT', 'total')
    .group('listings_filters.id')

  /*
   * Since we're joining listings_filters and brand_agents,
   * duplicates may show up (websites#15).
   * Using DISTINCT would mean we'd have to sort by all selected filds, which is trouble.
   * So we group it, but only to make them unique
   */

  // Exclude private listings for everyone but mls members
  if (a.mls) {
    q.where('public_display IS TRUE OR listings_filters.mls = ?', a.mls)
  } else if (a.brand) {
    q.where('public_display IS TRUE OR brand_agents.user = ?', a.created_by)
  } else {
    q.where('public_display IS TRUE')
  }


  if (a.limit)
    q.limit(a.limit)

  if (a.offset)
    q.offset(a.offset)

  if (a.mls_filter)
    q.where('listings_filters.mls = ?::mls', a.mls_filter)

  if (a.listing_statuses && a.listing_statuses.length > 0)
    q.where('listings_filters.status IN ?', a.listing_statuses)

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

  if (a.maximum_bedrooms)
    q.where('bedroom_count <= ?', a.maximum_bedrooms)

  if (a.number_of_pets_allowed)
    q.where('number_of_pets_allowed >= ?', a.number_of_pets_allowed)

  if (a.minimum_bathrooms)
    q.where('bathroom_count >= ?', a.minimum_bathrooms)

  if (a.maximum_bathrooms)
    q.where('bathroom_count <= ?', a.maximum_bathrooms)

  if (Array.isArray(a.property_types) && a.property_types.length > 0)
    q.where('property_type IN ?', a.property_types)

  if (Array.isArray(a.property_subtypes) && a.property_subtypes.length > 0)
    q.where('property_subtype IN ?', a.property_subtypes)

  if (a.minimum_year_built)
    q.where('year_built >= ?', a.minimum_year_built)

  if (a.maximum_year_built)
    q.where('year_built <= ?', a.maximum_year_built)

  if (a.pool === true)
    q.where('pool_yn = true')
  if (a.pool === false)
    q.where('pool_yn = false OR pool_yn IS NULL')

  if (a.pets === true)
    q.where('pets_yn = true')
  if (a.pets === false)
    q.where('pets_yn = false OR pets_yn IS NULL')

  if (a.furnished === true)
    q.where('furnished_yn = true')
  if (a.furnished === false)
    q.where('furnished_yn = false OR furnished_yn IS NULL')

  if (a.appliances === true)
    q.where('appliances_yn = true')
  if (a.appliances === false)
    q.where('appliances_yn = false OR appliances_yn IS NULL')

  if (a.fenced_yard === true)
    q.where('fenced_yard_yn = true')
  if (a.fenced_yard === false)
    q.where('fenced_yard_yn = false OR fenced_yard_yn IS NULL')

  if (a.application_fee === true)
    q.where('application_fee_yn = true')
  if (a.application_fee === false)
    q.where('application_fee_yn = false OR application_fee_yn IS NULL')

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
       OR co_selling_office_mls_id IN ?`, a.offices, a.offices, a.offices, a.offices)

  if (a.agents && a.agents.length > 0) {
    const condition = '(listings_filters.mls = agents.mls AND agents.matrix_unique_id IN(list_agent_mui, co_list_agent_mui, selling_agent_mui, co_selling_agent_mui))'
    q.join('agents', 'agents', condition)

    q.where('agents.id IN ?', a.agents)
  }

  addAreas(q, a)
  addStyles(q, a)

  if (a.open_house)
    q.where(HAS_OPEN_HOUSE)

  if (a.master_bedroom_in_first_floor)
    q.where(MASTER_BEDROOM_IN_FIRST_FLOOR)

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
    q.where('high_school_name IN ?', a.high_schools)

  if (a.intermediate_schools && a.intermediate_schools.length > 0)
    q.where('intermediate_school_name IN ?', a.intermediate_schools)

  if (a.sort_order && Array.isArray(a.sort_order))
    a.sort_order.forEach(name => orderBy(q, a, name))

  if (a.postal_codes && a.postal_codes.length > 0)
    q.where('postal_code IN ?', a.postal_codes)

  if (a.brand)
    addBrand(q, a)

  if (a.search)
    addSearch(q, a)

  Context.log(q.toString())

  return q
}
