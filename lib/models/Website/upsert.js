const async = require('async')
const names = require('docker-names')
const isValidHostname = require('is-valid-hostname')

const config     = require('../../config.js')
const db         = require('../../utils/db.js')
const validator  = require('../../utils/validator.js')
const { expect } = validator

const TemplateInstance = require('../Template/instance/get')
const Listing = require('../Listing/get')

const schema = {
  type: 'object',
  properties: {
    template: {
      type: 'string',
      required: false
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
      required: false
    }
  }
}

const validate = validator.bind(null, schema)

const { get } = require('./get')

const generateHostnames = ({ listing }) => {
  const hostnames = []

  const suffix = `.${config.webserver.host}`

  if (listing) {
    const sub = listing.property.address.street_address.replace(/\s/g, '')
    hostnames.push(sub + suffix)
  }

  const dockerized = names.getRandomName().replace('_', '-') + suffix

  hostnames.push(dockerized)

  return hostnames
}

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

  const getInstance = (cb, results) => {
    if (!website.template_instance)
      return cb()

    TemplateInstance.get(website.template_instance).nodeify(cb)
  }

  const getListing = (cb, results) => {
    if (!results.instance)
      return cb()

    if (!results.instance.listings?.length)
      return cb()

    Listing.get(results.instance.listings[0], cb)
  }

  const addHostname = (cb, results) => {
    const hostnames = website.hostname || generateHostnames({
      listing: results.listing
    })

    const add = (hostname, cb) => {
      addHost({
        hostname,
        website: results.save.rows[0].id,
        is_default: false
      }, (err, res) => {
        if(err)
          return cb(false)

        return cb(res)
      })
    }

    async.detectSeries(hostnames, add, hostname => {
      cb()
    })
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
    instance: [getInstance],
    listing: ['instance', getListing],
    hostname: ['save', 'listing', addHostname]
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

  const isValid = isValidHostname(hostname)
  expect(isValid, 'Invalid Hostname').to.be.true


  db.query('website/insert_hostname', [
    website,
    hostname,
    is_default
  ], (err, res) => {
    if (err) {
      return cb(err)
    }

    /* Hostnames are unique.
     * However, adding a unique hostname cannot throw an error because website creation process
     * may need to try several hostnames.
     *
     * So the query will return a row in case of a successful add.
     * If it returns, that means hostname was added.
     * If not, it mans the hostname was NOT added
     */

    return cb(null, Boolean(res.rows?.length))
  })
}


module.exports = {
  create,
  update,
  addHost
}
