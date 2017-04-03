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

    initChatroom(brand, user, cb)
  })
}

function initChatroom(brand, user, cb) {
  if (brand.room) //Already have a room together
    return cb(null, brand)

  // Makes sure the user has a chatroom with his team (for Backoffice chat)
  if (!user)
    return cb(null, brand)

  if (!brand.users)
    return cb(null, brand)

  if (brand.users.indexOf(user) < 0) // Not a member of this brand. Just a user of this brand.
    return cb(null, brand)

  if (!brand.roles || !brand.roles.Backoffice) //There's no backoffice defined for this brand. No need for a chatroom.
    return cb(null, brand)

  if (brand.roles.Backoffice.indexOf(user) > -1) // He is backoffice himself. Needs no room with backoffice.
    return cb(null, brand)

  // If we're here it means A user, who is actually a member of this brand
  // is trying to get current brand, and he is supposed to have a chatroom with them,
  // as they have some people marked as backoffice
  // But such room does not exist. Therefore, we need to create and store that room.

  Room.create({
    users: [
      ...brand.roles.Backoffice,
      user
    ],
    title: 'Backoffice',
    room_type: 'Group',
    owner: user,
    owner_reference: `Brand/${brand.id}`
  }, (err, room) => {
    if (err)
      return cb(err)

    brand.room = room.id

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

Brand.limitAccess = ({brand, user, action}, cb) => {
  Brand.get(brand, (err, brand) => {
    if (err)
      return cb(err)

    const has = Brand.hasAccess({
      brand,
      user,
      action
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
