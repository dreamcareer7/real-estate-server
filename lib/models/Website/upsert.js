const async = require('async')
const names = require('docker-names')

const config    = require('../../config.js')
const db        = require('../../utils/db.js')
const validator = require('../../utils/validator.js')

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

const { get } = require('./get')


const create = (website, cb) => {
  const save = cb => {
    db.query('website/insert', [
      website.template,
      website.user,
      website.brand,
      website.attributes,
      website.title,
      website.template_instance
    ], cb)
  }

  const addHostname = (cb, results) => {
    const hostnames = website.hostname || []
    const temp = names.getRandomName().replace('_', '-') + '.' + config.webserver.host
    hostnames.push(temp)

    const add = (hostname, cb) => {
      addHost({
        hostname,
        website: results.save.rows[0].id,
        is_default: false
      }, cb)
    }

    async.each(hostnames, add, cb)
  }

  const done = (err, results) => {
    if (err) {
      return cb(err)
    }

    get(results.save.rows[0].id, cb)
  }

  async.auto({
    validate: cb => validate(website, cb),
    save: ['validate', save],
    hostname: ['save', addHostname]
  }, done)
}

const update = (id, website, cb) => {
  validate(website, err => {
    if (err) {
      return cb(err)
    }

    db.query('website/update', [
      website.template,
      website.brand,
      website.attributes,
      website.title,
      website.template_instance,
      id
    ], (err) => {
      if (err) {
        return cb(err)
      }

      get(id, cb)
    })
  })
}

const addHost = function({website, hostname, is_default}, cb) {
  db.query('website/insert_hostname', [
    website,
    hostname,
    is_default
  ], err => {
    if (err) {
      return cb(err)
    }

    get(website, cb)
  })
}


module.exports = {
  create,
  update,
  addHost
}
