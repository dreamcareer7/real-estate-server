const db = require('../../utils/db')
const ObjectUtil = require('../ObjectUtil')
const Brand = require('../Brand/get')
const Orm = {
  ...require('../Orm/registry'),
  ...require('../Orm/context'),
}

const promisify = require('../../utils/promisify')

const get = function (id, cb) {
  getAll([id]).nodeify((err, listings) => {
    if(err)
      return cb(err)

    if (listings.length < 1)
      return cb(Error.ResourceNotFound(`Listing ${id} not found`))

    const listing = listings[0]

    return cb(null, listing)
  })
}

const getAll = async function(listing_ids) {
  const user_id = ObjectUtil.getCurrentUser()
  const brand = Brand.getCurrent()
  const brand_id = brand ? brand.id : null
  const associations = Orm.getEnabledAssociations()

  return db.select('listing/get', [
    listing_ids,
    user_id,
    brand_id,
    associations,
  ])
}

const getCompacts = async function (ids) {
  const brand = Brand.getCurrent()
  const brand_id = brand ? brand.id : null
  const associations = Orm.getEnabledAssociations()

  return db.select('listing/get_compacts', [
    ids,
    ObjectUtil.getCurrentUser(),
    brand_id,
    associations
  ])
}

const getMlsAreas = (ids, cb) => {
  db.query('listing/area/get', [ids], (err, res) => {
    if (err)
      return cb(err)

    const areas = res.rows

    areas.forEach(area => {
      area.id = `[${area.number},${area.parent}]`
    })

    cb(null, areas)
  })
}


const getByMUI = async function (mui, mls) {
  const ids = await db.selectIds('listing/get_mui', [mui, mls])

  if (ids.length < 1)
    throw Error.ResourceNotFound(`Listing ${mui} not found.`)

  return promisify(get)(ids[0])
}

/**
 * @param {string} id 
 * @returns {Promise<IListing[]>}
 */
const getByMLSNumber = async function (id) {
  const ids = await db.selectIds('listing/get_mls_number', [id])

  if (ids.length < 1) {
    throw Error.ResourceNotFound('Listing not found.')
  }

  return getAll(ids)
}


const getMlsInfo = async function (mls) {
  const rows = await db.select('listing/get_mls_info', [mls])

  if (rows.length < 1) {
    throw Error.ResourceNotFound('mls not found.')
  }

  return rows
}

module.exports = {
  get,
  getAll,
  getCompacts,
  getMlsAreas,

  getByMLSNumber,
  getByMUI,
  getMlsInfo
}
