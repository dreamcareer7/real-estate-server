const _ = require('lodash')
const Brand = require('../../../lib/models/Brand')
const db = require('../../../lib/utils/db')

const getRoot = require('./get-root')

const INSERT = 'INSERT INTO de.regions(name, brand) VALUES ($1, $2)'

const add = async name => {
  const parent = await getRoot()

  const brand = await Brand.create({
    brand_type: Brand.OTHER,
    name,
    parent: parent.id
  })

  await db.executeSql.promise(INSERT, [
    name,
    brand.id,
  ])
}

const GET = 'SELECT * FROM de.regions'

const syncRegions = async regions => {
  const { rows } = await db.executeSql.promise(GET)
  const existing = _.map(rows, 'name').sort()

  const not_existing = _.difference(regions.sort(), existing)

  return Promise.all(not_existing.map(add))
}

module.exports = syncRegions
