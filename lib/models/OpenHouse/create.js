// const { Listing } = require('../Listing')
const db = require('../../utils/db')
const promisify = require('../../utils/promisify')
const redis = require('../../data-service/redis').createClient()
const validator = require('../../utils/validator')
const Context = require('../Context')
const { timeout } = require('../../utils/timeout')
const { Listing } = require('../Listing')
const zadd = promisify(redis.zadd.bind(redis))

const openhouseNotifKey = 'openhouse-notifications'

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
    ex.message = ex.message.replace('Validation Error', `Validation Error(${openhouse.mls})`)
    throw ex
  }

  const result = await db.query.promise('open_house/insert', [
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

  const oh = result.rows[0]
 
  // three senario might happen here
  // an open house is created for a future date
  // an open house that is for a future date is updated
  // an open house is created or updated in the past
  // we want to send notification for the first senario
  
  const isCreate = oh.created_at && oh.updated_at && oh.created_at.toString() === oh.updated_at.toString()
  const isForFuture = oh.start_time > Date.now() / 1000
  if (isCreate && isForFuture) {
    try {
      const listing = await Listing.getByMUI(openhouse.listing_mui, openhouse.mls)
      await zadd(openhouseNotifKey, Date.now(), listing.id)
      await zadd(`${openhouseNotifKey}-${listing.id}`, Date.now(), listing.id)
    } catch (e) {
      Context.log('Listing not found for open house', oh.id)
    }
  }

  return oh.id
}

module.exports = { create }
