const async = require('async')
const db = require('../../utils/db')
const { peanar } = require('../../utils/peanar')
const promisify = require('../../utils/promisify')
const config = require('../../config.js')
const P = require('password-generator')
const Stripe = require('../Stripe')
const User = require('../User/get')
const { createZone } = require('./zone')

const godaddy = require('./client')
const { get } = require('./get')

const error = Error.create.bind(null, {
  http: 500,
  message: 'Godaddy Gateway Error',
  code: 'Internal'
})

const registerDomain = async (options) => {
  const domain = await get(options.id)
  const registration = await promisify(godaddy.domains.purchase)(options)

  await Stripe.captureCharge(domain.charge)

  await db.query.promise('godaddy/domain/set-order', [
    options.id,
    registration.orderId
  ])

  return createZone(options)
}

const enqueueRegisterDomain = peanar.job({
  handler: registerDomain,
  queue: 'register_domain',
  error_exchange: 'register_domain.error',
  exchange: 'register_domain',
  name: 'registerDomain'
})

const purchaseDomain = (options, cb) => {
  const shopper = cb => getShopper(options.user, cb)

  const domain = (cb, results) => {
    godaddy.domains.available({
      domain: options.domain,
      check_type: godaddy.FULL
    }, (err, status) => {
      if (err)
        return cb(error(err))

      if (!status.available || !status.definitive)
        return cb(Error.Conflict('Domain ' + options.domain + ' is not available'))

      cb(null, status)
    })
  }

  const charge = (cb, results) => {
    Stripe.charge({
      user: options.user,
      amount: results.domain.price,
      customer: options.stripe
    }, cb)
  }

  const register = (cb, results) => {
    const consent = {
      agreementKeys: options.agreement.keys,
      agreedBy: options.agreement.ip,
      agreedAt: (new Date()).toISOString()
    }

    enqueueRegisterDomain({
      id: results.save,
      consent,
      domain: options.domain,
      contact_registrant: config.godaddy.registrant,
      contact_admin: config.godaddy.admin,
      contact_billing: config.godaddy.billing,
      contact_tech: config.godaddy.tech,
      auto_renew: false,
      period: 1,
      name_servers: config.godaddy.nameservers,
      shopper_id: results.shopper
    }).nodeify(cb)
  }

  const save = (cb, results) => {
    db.query('godaddy/domain/save', [
      options.domain,
      options.user,
      results.charge.id
    ], (err, res) => {
      if (err)
        return cb(err)

      cb(null, res.rows[0].id)
    })
  }

  async.auto({
    shopper,
    domain,
    charge: ['shopper', 'domain', charge],
    save: ['charge', save],
    register: ['charge', 'save', register],
  }, cb)
}

const getShopper = (user_id, cb) => {
  db.query('godaddy/user/get_shopper', [
    user_id
  ], (err, res) => {
    if (err)
      return cb(err)

    if (res.rows.length > 0)
      return cb(null, res.rows[0].shopper_id)

    createShopper(user_id, cb)
  })
}

const Password = () => (P(7, false, /[\w]/) + P(7, false, /\d/) + P(7, false, /\w/))

const createShopper = (user_id, cb) => {
  const getUser = cb => User.get(user_id).nodeify(cb)

  const password = Password()

  const createShopper = (cb, results) => {
    const options = {
      email: results.user.email,
      first_name: results.user.first_name,
      last_name: results.user.last_name,
      password
    }

    godaddy.shoppers.createSubAccount(options, (err, account) => {
      if (err)
        return cb(error(err))

      cb(null, account)
    })
  }

  const save = (cb, results) => {
    db.query('godaddy/user/save_shopper', [
      user_id,
      results.shopper.shopperId,
      results.user.email,
      password
    ], cb)
  }

  const done = (err, results) => {
    if (err)
      return cb (err)

    getShopper(user_id, cb)
  }

  async.auto({
    user: getUser,
    shopper: ['user', createShopper],
    saved: ['shopper', save]
  }, done)
}

const suggest = (options, cb) => {
  godaddy.domains.suggest(options, (err, domains) => {
    if (err)
      return cb(err)

    godaddy.domains.bulkAvailable({
      domains,
      check_type: godaddy.FULL
    }, (err, res) => {
      if (err)
        return cb(err)

      if (!res.domains)
        return cb(null, [])

      const results = res.domains
        .filter( d => d.available && d.definitive )

      cb(null, results)
    })
  })
}

const getAgreements = (options, cb) => {
  godaddy.domains.getAgreements(options, cb)
}

module.exports = {
  suggest,
  getAgreements,
  purchaseDomain
}
