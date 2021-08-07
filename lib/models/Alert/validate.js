const validator = require('../../utils/validator.js')

const { status_enum } = require('../Listing/constants')

const schema = {
  type: 'object',
  properties: {
    minimum_price: {
      type: ['null', 'number'],
      minimum: 0,
      required: false
    },

    maximum_price: {
      type: ['null', 'number'],
      minimum: 0,
      required: false
    },

    minimum_bedrooms: {
      type: ['null', 'number'],
      minimum: 0,
      required: false
    },

    minimum_bathrooms: {
      type: ['null', 'number'],
      minimum: 0,
      required: false
    },

    minimum_square_meters: {
      type: ['null', 'number'],
      minimum: 0,
      required: false
    },

    maximum_square_meters: {
      type: ['null', 'number'],
      minimum: 0,
      required: false
    },

    created_by: {
      type: [ 'null', 'string' ],
      uuid: true
    },

    points: {
      required: false,
      type: ['null', 'array'],
      minItems: 4,
      items: {
        type: 'object',
        properties: {
          latitude: {
            type: 'number',
            required: true
          },
          longitude: {
            type: 'number',
            required: true
          }
        }
      }
    },

    minimum_lot_square_meters: {
      type: ['null', 'number'],
      required: false,
      minimum: 0
    },

    maximum_lot_square_meters: {
      type: ['null', 'number'],
      required: false,
      minimum: 0
    },

    minimum_year_built: {
      type: ['null', 'number'],
      required: false,
      minimum: 0
    },

    maximum_year_built: {
      type: ['null', 'number'],
      required: false,
      minimum: 0
    },

    pool: {
      type: ['null', 'boolean'],
      required: false
    },

    pets: {
      type: ['null', 'boolean'],
      required: false
    },

    number_of_pets_allowed: {
      type: ['null', 'number'],
      required: false
    },

    application_fee: {
      type: ['null', 'boolean'],
      required: false
    },

    appliances: {
      type: ['null', 'boolean'],
      required: false
    },

    furnished: {
      type: ['null', 'boolean'],
      required: false
    },

    fenced_yard: {
      type: ['null', 'boolean'],
      required: false
    },

    title: {
      type: [ 'null', 'string' ],
      required: false
    },

    property_types: {
      type: ['array'],
      uniqueItems: true,
      required: false,
      items: {
        enum: [ 'Residential', 'Residential Lease', 'Multi-Family', 'Commercial', 'Lots & Acreage' ]
      }
    },

    property_subtypes: {
      required: false,
      type: ['array'],
      uniqueItems: true,
      items: {
        enum: [
          'MUL-Apartment/5Plex+',
          'MUL-Fourplex',
          'MUL-Full Duplex',
          'MUL-Multiple Single Units',
          'MUL-Triplex',
          'LSE-Apartment',
          'LSE-Condo/Townhome',
          'LSE-Duplex',
          'LSE-Fourplex',
          'LSE-House',
          'LSE-Mobile',
          'LSE-Triplex',
          'LND-Commercial',
          'LND-Farm/Ranch',
          'LND-Residential',
          'RES-Condo',
          'RES-Farm/Ranch',
          'RES-Half Duplex',
          'RES-Single Family',
          'RES-Townhouse',
          'COM-Lease',
          'COM-Sale',
          'COM-Sale or Lease (Either)',
          'COM-Sale/Leaseback (Both)'
        ]
      }
    },

    listing_statuses: {
      required: false,
      type: ['null', 'array'],
      uniqueItems: true,
      minItems: 1,
      items: {
        enum: status_enum
      }
    },

    open_house: {
      type: [ 'null', 'boolean'],
      required: false
    },

    minimum_sold_date: {
      type: [ 'null', 'number' ],
      required: false
    },

    excluded_listing_ids: {
      type: [ 'null', 'array' ],
      uniqueItems: true,
      minItems: 0,
      items: {
        type: 'string',
        uuid: true
      }
    },

    mls_areas: {
      type: ['null', 'array'],
      required: false
    },

    postal_codes: {
      type: ['null', 'array'],
      required: false
    },

    search: {
      type: ['null', 'string'],
      required: false
    }
  }
}

const validate = validator.bind(null, schema)

const validatePointsArray = function (alert, cb) {
  const p1 = alert.points[0]
  const p2 = alert.points[alert.points.length - 1]

  if ((p1.longitude !== p2.longitude) ||
     (p1.latitude !== p2.latitude))
    return cb(Error.Validation('Points array must form a closed polygon with at least 4 points'))

  return cb()
}

module.exports = {
  validate,
  validatePointsArray
}
