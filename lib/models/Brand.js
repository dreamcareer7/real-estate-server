const url = require('url')
const db = require('../utils/db.js')
const config = require('../config.js')

Brand = {}
Orm.register('brand', Brand)

Brand.get = function (id, cb, user) {
  if (!user && process.domain.user)
    user = process.domain.user.id

  db.query('brand/get', [id, user], (err, res) => {
    if (err)
      return cb(err)

    if (res.rows.length < 1)
      return cb(Error.ResourceNotFound('Brand ' + id + ' not found'))

    const brand = res.rows[0]

    organizeRoles(brand)

    const hostname = (brand.hostnames && brand.hostnames.length) ? brand.hostnames[0] : config.webapp.hostname
    
    brand.base_url = url.format({
      protocol: config.webapp.protocol,
      hostname: hostname,
    })

    cb(null, brand)
  })
}

function organizeRoles (brand) {
  if (!brand.roles)
    return

  const roles = JSON.parse(JSON.stringify(brand.roles))

  roles.forEach(r => {
    if (!brand.roles[r.role])
      brand.roles[r.role] = []

    brand.roles[r.role].push(r.user)
  })
}

Brand.getByHostname = function (hostname, cb) {
  db.query('brand/get_hostname', [hostname], (err, res) => {
    if (err)
      return cb(err)

    if (res.rows.length < 1)
      return cb(Error.ResourceNotFound('Brand ' + hostname + ' not found'))

    return Brand.get(res.rows[0].brand, cb)
  })
}

Brand.proposeUserForListingInquiry = function (brand_id, listing_id, cb) {
  Brand.getDefaultUser(brand_id, cb)
}

Brand.proposeContactingUser = function (brand_id, cb) {
  Brand.getDefaultUser(brand_id, cb)
}

Brand.getDefaultUser = function (brand_id, cb) {
  Brand.get(brand_id, (err, brand) => {
    if (err)
      return cb(err)

    if (brand.roles && brand.roles.Default)
      return User.get(brand.roles.Default[0], cb)

    if (brand.users)
      return User.get(brand.users[0], cb)

    cb()
  })
}

Brand.getCurrent = () => {
  if (process.domain && process.domain.brand)
    return process.domain.brand
}

Brand.publicize = function (model) {
  if (model.palette)
    model.palette.type = 'brand_palette'

  if (model.assets)
    model.assets.type = 'brand_assets'

  if (model.messages)
    model.messages.type = 'brand_messages'
}

Brand.associations = {
  users: {
    collection: true,
    model: 'User'
  },

  agents: {
    collection: true,
    model: 'Agent'
  },

  offices: {
    collection: true,
    model: 'Office'
  },

  parent: {
    optional: true,
    model: 'Brand'
  }
}

module.exports = function () {}
