const async = require('async')
const names = require('docker-names')

const config = require('../config.js')
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
  const save = cb => {
    db.query('website/insert', [
      website.template,
      website.user,
      website.brand,
      website.attributes
    ], cb)
  }

  const addHostname = (cb, results) => {
    const hostnames = website.hostname || []
    const temp = names.getRandomName().replace('_', '-') + '.' + config.webserver.host
    hostnames.push(temp)

    const add = (hostname, cb) => {
      Website.addHostname({
        hostname,
        website: results.save.rows[0].id,
        is_default: false
      }, cb)
    }

    async.each(hostnames, add, cb)
  }

  const done = (err, results) => {
    if (err)
      return cb(err)

    Website.get(results.save.rows[0].id, cb)
  }

  async.auto({
    validate: cb => validate(website, cb),
    save: ['validate', save],
    hostname: ['save', addHostname]
  }, done)
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
    ], (err) => {
      if (err)
        return cb(err)

      Website.get(id, cb)
    })
  })
}

Website.get = function (id, cb) {
  Website.getAll([id], (err, websites) => {
    if(err)
      return cb(err)

    if (websites.length < 1)
      return cb(Error.ResourceNotFound(`Website ${id} not found`))

    const website = websites[0]

    return cb(null, website)
  })
}

Website.getAll = function(website_ids, cb) {
  db.query('website/get', [website_ids], (err, res) => {
    if (err)
      return cb(err)

    const websites = res.rows

    return cb(null, websites)
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

Website.deleteHostname = function({website, hostname}, cb) {
  db.query('website/delete_hostname', [
    website,
    hostname
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
