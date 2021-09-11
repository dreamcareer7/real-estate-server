const validator = require('../../utils/validator.js')
const db = require('../../utils/db.js')

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
        'COM-Lease', 'COM-Sale', 'COM-Sale or Lease (Either)', 'COM-Sale/Leaseback (Both)', 'Lot/Land', 'Unknown']
    },

    matrix_unique_id: {
      type: ['string', 'number'],
      required: true
    },

    parking_spaces_covered_total: {
      type: 'number',
      required: false
    },

    year_built: {
      type: 'number',
      required: false,
      maximum: 32767
    },

    number_of_dining_areas: {
      type: 'number',
      required: false,
      maximum: 32767
    },

    number_of_living_areas: {
      type: 'number',
      required: false,
      maximum: 32767
    },

    fireplaces_total: {
      type: 'number',
      required: false,
      maximum: 32767
    },

    number_of_pets_allowed: {
      type: 'number',
      required: false,
      maximum: 32767
    },

    number_of_units: {
      type: 'number',
      required: false,
      maximum: 32767
    },

    description: {
      type: ['string'],
      required: true
    }
  }
}

const validate = validator.promise.bind(null, schema)

const insert = async property => {
  const { rows } = await db.query.promise('property/insert', [
    property.property_type,
    property.property_subtype,
    property.bedroom_count,
    property.bathroom_count,
    property.address_id,
    property.matrix_unique_id,
    property.description,
    property.square_meters,
    property.lot_square_meters,
    property.year_built,
    property.parking_spaces_covered_total,
    property.exterior_features,
    property.interior_features,
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
    property.number_of_stories,
    property.number_of_parking_spaces,
    property.garage_length,
    property.garage_width,
    property.number_of_dining_areas,
    property.number_of_living_areas,
    property.fireplaces_total,
    property.lot_number,
    property.soil_type,
    property.construction_materials,
    property.foundation_details,
    property.roof,
    property.pool_yn,
    property.handicap_yn,
    property.elementary_school_name,
    property.intermediate_school_name,
    property.high_school_name,
    property.junior_high_school_name,
    property.middle_school_name,
    property.primary_school_name,
    property.senior_high_school_name,
    property.school_district,
    property.subdivision_name,
    property.appliances_yn,
    property.green_building_certification,
    property.green_energy_efficient,
    property.lot_size,
    property.lot_size_area,
    property.lot_size_dimensions,
    property.number_of_pets_allowed,
    property.number_of_units,
    property.pets_yn,
    property.furnished_yn,
    property.fenced_yard_yn,
    property.block,
    property.mls
  ])

  return rows[0].id
}

const create = async property => {
  try {
    await validate(property)
  } catch (ex) {
    ex.message = ex.message.replace('Validation Error', `Validation Error(${property.mls})`)
    throw ex
  }
  return insert(property)
}

module.exports = {
  create
}
