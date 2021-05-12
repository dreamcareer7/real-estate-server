const { Listing } = require('../Listing')
const db = require('../../utils/db')
const validator = require('../../utils/validator')
const Context = require('../Context')
const { timeout } = require('../../utils/timeout')

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
  try {
    await validate(openhouse)
  } catch (ex) {
    // Usually such errors occur at a high frequency one after another.
    // This will put a little bit of space between them.
    await timeout(500)
    ex.message = ex.message.replace('Error:', `Error(${openhouse.mls}):`)
    throw ex
  }

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
    await Listing.notify.openHouse(listing.id)
    // await Listing.touch(listing.id, 'OpenHouseAvailable')
  } catch(e) {
    Context.log('Listing not found for open house', oh.id)
  }

  return oh.id
}

module.exports = { create }
