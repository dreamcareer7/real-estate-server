const db = require('../utils/db.js')
const validator = require('../utils/validator.js')
const promisify = require('../utils/promisify.js')

OpenHouse = {}

Orm.register('open_house', 'OpenHouse')

const schema = {
  type: 'object',
  properties: {
    listing_mui: {
      required: true,
      type: 'number'
    },

    description: {
      required: false,
      type: 'string'
    },

    matrix_unique_id: {
      type: 'number',
      required: true
    },

    start_time: {
      type: 'string',
      required: true
    },

    end_time: {
      type: 'string',
      required: true
    },

    refreshments: {
      type: 'string'
    },

    type: {
      type: 'string',
      required: true
    }
  }
}

const validate = validator.promise.bind(null, schema)

OpenHouse.get = async id => {
  const open_houses = await OpenHouse.getAll([id])

  if (open_houses.length < 1)
    throw Error.ResourceNotFound('OpenHouse ' + id + ' not found')

  return open_houses[0]
}

OpenHouse.getAll = async ids => {
  const res = await db.query.promise('open_house/get', [ids])

  return res.rows
}

OpenHouse.create = async openhouse => {
  await validate(openhouse)

  const res = await db.query.promise('open_house/insert', [
    openhouse.start_time,
    openhouse.end_time,
    openhouse.description,
    openhouse.listing_mui,
    openhouse.refreshments,
    openhouse.type,
    openhouse.matrix_unique_id
  ])

  await promisify(Listing.touchByMUI)(openhouse.listing_mui, 'OpenHouseAvailable')

  return res.rows[0].id
}

module.exports = function () {}
