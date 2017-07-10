const validator = require('../utils/validator.js')
const db = require('../utils/db.js')

Property = {}

Orm.register('property', 'Property')

const schema = {
  type: 'object',
  properties: {
    property_type: {
      type: 'string',
      required: true,
      enum: ['Residential', 'Residential Lease', 'Multi-Family', 'Commercial', 'Lots & Acreage', 'Unknown']
    },

    property_subtype: {
      type: 'string',
      required: true,
      enum: ['MUL-Apartment/5Plex+', 'MUL-Fourplex', 'MUL-Full Duplex', 'MUL-Multiple Single Units', 'MUL-Triplex',
        'LSE-Apartment', 'LSE-Condo/Townhome', 'LSE-Duplex', 'LSE-Fourplex', 'LSE-House', 'LSE-Mobile', 'LSE-Triplex',
        'LND-Commercial', 'LND-Farm/Ranch', 'LND-Residential',
        'RES-Condo', 'RES-Farm/Ranch', 'RES-Half Duplex', 'RES-Single Family', 'RES-Townhouse',
        'COM-Lease', 'COM-Sale', 'COM-Sale or Lease (Either)', 'COM-Sale/Leaseback (Both)', 'Unknown']
    },

    matrix_unique_id: {
      type: 'number',
      required: true
    },

    parking_spaces_covered_total: {
      type: 'number',
      required: false
    },

    year_built: {
      type: 'number',
      required: false
    }
  }
}

const validate = validator.bind(null, schema)

function insert (property, cb) {
  db.query('property/insert', [
    property.property_type,
    property.property_subtype,
    property.bedroom_count,
    property.bathroom_count,
    property.address_id,
    property.matrix_unique_id,
    property.description,
    property.square_meters,
    property.building_square_meters,
    property.lot_square_meters,
    property.year_built,
    property.parking_spaces_covered_total,
    property.accessibility_features,
    property.bedroom_bathroom_features,
    property.commercial_features,
    property.community_features,
    property.energysaving_features,
    property.exterior_features,
    property.interior_features,
    property.farmranch_features,
    property.fireplace_features,
    property.lot_features,
    property.parking_features,
    property.pool_features,
    property.security_features,
    property.half_bathroom_count,
    property.full_bathroom_count,
    property.heating,
    property.flooring,
    property.utilities,
    property.utilities_other,
    property.architectural_style,
    property.structural_style,
    property.number_of_stories,
    property.number_of_stories_in_building,
    property.number_of_parking_spaces,
    property.parking_spaces_carport,
    property.parking_spaces_garage,
    property.garage_length,
    property.garage_width,
    property.number_of_dining_areas,
    property.number_of_living_areas,
    property.fireplaces_total,
    property.lot_number,
    property.soil_type,
    property.construction_materials,
    property.construction_materials_walls,
    property.foundation_details,
    property.roof,
    property.pool_yn,
    property.handicap_yn,
    property.elementary_school_name,
    property.intermediate_school_name,
    property.high_school_Name,
    property.junior_high_school_name,
    property.middle_school_name,
    property.primary_school_name,
    property.senior_high_school_name,
    property.school_district,
    property.subdivision_name,
    property.appliances_yn,
    property.building_number,
    property.ceiling_height,
    property.green_building_certification,
    property.green_energy_efficient,
    property.lot_size,
    property.lot_size_area,
    property.lot_size_dimensions,
    property.map_coordinates,
    property.number_of_pets_allowed,
    property.number_of_units,
    property.pets_yn,
    property.photo_count,
    property.room_count,
    property.subdivided_yn,
    property.surface_rights,
    property.unit_count,
    property.year_built_details,
    property.zoning,
    property.security_system_yn,
    property.furnished_yn,
    property.fenced_yard_yn
  ], (err, res) => {
    if (err)
      return cb(err)

    return cb(null, res.rows[0].id)
  })
}

Property.create = function (property, cb) {
  validate(property, function (err) {
    if (err)
      return cb(err)

    insert(property, cb)
  })
}


module.exports = function () {}
