const ObjectUtil = require('../ObjectUtil')
const db = require('../../utils/db')
const promisify = require('../../utils/promisify')


const {
  getAddress
} = require('./email/address')

const get = function (id, cb) {
  getAll([id], (err, deals) => {
    if(err)
      return cb(err)

    if (deals.length < 1)
      return cb(Error.ResourceNotFound(`Deal ${id} not found`))

    const deal = deals[0]

    return cb(null, deal)
  })
}

const getAll = function(deal_ids, cb) {
  const user_id = ObjectUtil.getCurrentUser()

  db.query('deal/get', [deal_ids, user_id], (err, res) => {
    if (err)
      return cb(err)

    const deals = res.rows.map(r => {
      if (!r.context)
        r.context = {}

      r.email = getAddress(r)

      return r
    })

    return cb(null, deals)
  })
}

const getByNumber = async number => {
  const row = await db.selectOne('deal/by-number', [number])
  if (!row)
    throw Error.ResourceNotFound(`Deal Number ${number} not found`)

  return promisify(get)(row.id)
}

const getUserDeals = (user_id, limit, cb) => {
  if (!cb)
    cb = limit // Limit is optional

  db.query('deal/user', [
    user_id,
    limit
  ], (err, res) => {
    if (err)
      return cb(err)

    getAll(res.rows.map(r => r.id), cb)
  })
}

const getBrandDeals = (brand_id, limit, cb) => {
  if (!cb)
    cb = limit // Limit is optional

  db.query('deal/brand', [
    brand_id,
    limit
  ], (err, res) => {
    if (err)
      return cb(err)

    getAll(res.rows.map(r => r.id), cb)
  })
}

const getBrandInbox = (brand_id, cb) => {
  db.query('deal/brand_inbox', [
    brand_id
  ], (err, res) => {
    if (err)
      return cb(err)

    getAll(res.rows.map(r => r.id), cb)
  })
}

const getByRoom = async room_id => {
  const res = await db.query.promise('deal/by_room', [room_id])
  if (res.rows.length < 1)
    throw new Error.ResourceNotFound(`Cannot find deal of room ${room_id}`)

  return res.rows[0].deal
}


module.exports = {
  get,
  getAll,
  getByRoom,
  getByNumber,
  getUserDeals,
  getBrandInbox,
  getBrandDeals
}
