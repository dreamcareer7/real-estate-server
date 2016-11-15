const async = require('async')

const db = require('../utils/db.js')
const validator = require('../utils/validator.js')

Website = {}
Orm.register('website', Website)

const schema = {
  type: 'object',
  properties: {
    template: {
      type: 'string',
      required: true
    },

    user: {
      type: 'string',
      uuid: true,
      required: true
    },

    brand: {
      type: 'string',
      uuid: true,
      required: false
    },

    attributes: {
      type: 'object',
      required: true
    }
  }
}

const validate = validator.bind(null, schema)

Website.create = (website, cb) => {
  validate(website, err => {
    if (err)
      return cb(err)

    db.query('website/insert', [
      website.template,
      website.user,
      website.brand,
      website.attributes
    ], (err, inserted) => {
      if (err)
        return cb(err)

      Website.get(inserted.rows[0].id, cb)
    })
  })
}

Website.update = (id, website, cb) => {
  validate(website, err => {
    if (err)
      return cb(err)

    db.query('website/update', [
      website.template,
      website.brand,
      website.attributes,
      id
    ], (err, updated) => {
      if (err)
        return cb(err)

      Website.get(id, cb)
    })
  })
}

Website.get = function (id, cb) {
  db.query('website/get', [id], (err, res) => {
    if (err)
      return cb(err)

    if (res.rows.length < 1)
      return cb(Error.ResourceNotFound('Website ' + id + ' not found'))

    const website = res.rows[0]

    cb(null, website)
  })
}

Website.getByUser = function (user_id, cb) {
  db.query('website/get_user', [user_id], (err, res) => {
    if (err)
      return cb(err)

    const website_ids = res.rows.map(r => r.id)

    async.map(website_ids, Website.get, (err, websites) => {
      if (err)
        return cb(err)

      return cb(null, websites)
    })
  })
}

Website.getByHostname = function (hostname, cb) {
  db.query('website/get_hostname', [hostname], (err, res) => {
    if (err)
      return cb(err)

    if (res.rows.length < 1)
      return cb(Error.ResourceNotFound('Website ' + hostname + ' not found'))

    return Website.get(res.rows[0].website, cb)
  })
}

Website.addHostname = function({website, hostname, is_default}, cb) {
  db.query('website/insert_hostname', [
    website,
    hostname,
    is_default
  ], err => {
    if (err)
      return cb(err)

    Website.get(website, cb)
  })
}

Website.associations = {
  user: {
    model: 'User'
  },

  brand: {
    optional: true,
    model: 'Brand'
  }
}

module.exports = function () {}
