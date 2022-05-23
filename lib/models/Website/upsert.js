const async = require('async')
const names = require('docker-names')
const isValidHostname = require('is-valid-hostname')

const config     = require('../../config.js')
const db         = require('../../utils/db.js')
const validator  = require('../../utils/validator.js')
const slugify = require('../../utils/slugify')

const TemplateInstance = require('../Template/instance/get')
const Listing = require('../Listing/get')
const Brand = require('../Brand/get')
const BrandSettings = require('../Brand/settings/get')

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

const getRootDomain = async brand_id => {
  const parent_ids = await Brand.getParents(brand_id)
  const settings = await BrandSettings.getByBrands(parent_ids)

  for (const setting of settings)
    if (setting.websites_root_domain)
      return setting.websites_root_domain

  return config.webserver.host
}

const generateHostnames = async ({ listing, brand_id }) => {
  const suggestions = []

  /* We need to generate some potential hostnames if this is a listing.
   * First we make sure we normalize listing addresses. Some of them have too many
   * spaces. For example "1010  Junior Street Unit 20" (It has 2 spaced between 1010 and Junior).
   * We remove extra expaces and and make there's only 1 space between each word.
   *
   * Then We'll try to generate suggestions like these:
   * 1010JuniorStreetUnit20
   * 1010-Junior-Street-Unit-20
   * 1010Junior-Street-Unit-20
   * 1010JuniorStreet-Unit-20
   * 1010JuniorStreetUnit-20
   *
   * We hope one of these suggestions is available. If not, we will generate
   * a dockerized name.
   */

  if (listing) {
    const address = slugify(listing.property.address.street_address)
    
    suggestions.push(address.replace(/\s/g, ''))
    suggestions.push(address)

    let dynamic = address
    while(dynamic.includes('-')) {
      dynamic = dynamic.replace('-', '')
      suggestions.push(dynamic)
    }
  }
  suggestions.push(names.getRandomName().replace('_', '-'))

  const host = await getRootDomain(brand_id)
  const suffix = `.${host}`

  return suggestions.map(suggestion => suggestion + suffix)
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

    generateHostnames({
      listing: results.listing,
      brand_id: website.brand
    }).nodeify((err, hostnames) => {
      if (err)
        return cb(err)

      async.detectSeries(hostnames, add, hostname => {
        cb()
      })
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
  if (!isValid) {
    return cb(new Error(`Invalid Hostname ${hostname}`))
  }
  
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
