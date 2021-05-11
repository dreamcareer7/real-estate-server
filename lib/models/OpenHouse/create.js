const { Listing } = require('../Listing')
const db = require('../../utils/db')
const validator = require('../../utils/validator')
const Context = require('../Context')

const schema = {
  type: 'object',
  properties: {
    listing_mui: {
      required: true,
      type: ['number', 'string']
    },

    description: {
      required: false,
      type: 'string'
    },

    matrix_unique_id: {
      type: ['number', 'string'],
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

const create = async openhouse => {
  await validate(openhouse)

  const { rows } = await db.query.promise('open_house/insert', [
    openhouse.start_time,
    openhouse.end_time,
    openhouse.description,
    openhouse.listing_mui,
    openhouse.refreshments,
    openhouse.type,
    openhouse.tz,
    openhouse.matrix_unique_id,
    openhouse.mls
  ])

  const oh = rows[0]

  try {
    const listing = await Listing.getByMUI(openhouse.listing_mui, openhouse.mls)
    await Listing.notify.openHouse(listing)
    // await Listing.touch(listing.id, 'OpenHouseAvailable')
  } catch(e) {
    Context.log('Listing not found for open house', oh.id)
  }

  return oh.id
}

module.exports = { create }
