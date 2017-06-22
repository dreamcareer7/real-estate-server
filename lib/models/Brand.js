const url = require('url')
const db = require('../utils/db.js')
const config = require('../config.js')

Brand = {}
Orm.register('brand', 'Brand')

Brand.get = (id, cb, user) => {

  Brand.getAll([id], (err, brands, user) => {
    if (err)
      return cb(err)

    if (brands.length < 1)
      return cb(Error.ResourceNotFound(`Brand ${id} not found`))

    cb(null, brands[0])
  })
}

Brand.getAll = (ids, cb, user) => {
  if (!user && process.domain.user)
    user = process.domain.user.id

  db.query('brand/get', [ids, user], (err, res) => {
    if (err)
      return cb(err)

    const brands = res.rows

    brands.forEach(brand => {
      organizeRoles(brand)

      const hostname = (brand.hostnames && brand.hostnames.length) ? brand.hostnames[0] : config.webapp.hostname

      brand.base_url = url.format({
        protocol: config.webapp.protocol,
        hostname: hostname,
      })
    })

    cb(null, brands)
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

Brand.limitAccess = ({brand, user, role}, cb) => {
  Brand.get(brand, (err, brand) => {
    if (err)
      return cb(err)

    const has = Brand.hasAccess({
      brand,
      user,
      role
    })

    if (!has)
      return cb(Error.Forbidden('Access denied to brand resource'))

    cb()
  })
}

Brand.isChildOf = (brand_id, parent, cb) => {
  db.query('brand/is_child', [
    brand_id,
    parent
  ], (err, res) => {
    if (err)
      return cb(err)

    cb(null, Boolean(res.rows[0].is))
  })
}

Brand.hasAccess = ({brand, user, role}) => {
  if (!brand.roles)
    return false

  if (brand.roles[role] && brand.roles[role].indexOf(user) > -1)
    return true

  if (brand.roles.Admin && brand.roles.Admin.indexOf(user) > -1)
    return true

  return false
}

Brand.getCurrent = () => {
  if (process.domain && process.domain.brand)
    return process.domain.brand
}

Brand.publicize = function (model) {
  /* There's simply no reason
   * to expose user's list to clients, specially as it might get big.
   * With that being said, internally we need it
   * to determine default user and detect if a room is possible
   */
  delete model.users

  if (model.palette)
    model.palette.type = 'brand_palette'

  if (model.assets)
    model.assets.type = 'brand_assets'

  if (model.messages)
    model.messages.type = 'brand_messages'

  if (model.roles)
    model.roles.forEach(role => {
      role.type = 'brand_role'
    })
}

Brand.associations = {
  parent: {
    optional: true,
    model: 'Brand'
  }
}

module.exports = function () {}
