const async = require('async')
const db = require('../utils/db')
const config = require('../config.js')
const P = require('password-generator')

const Password = () => (P(7, false, /[\w]/) + P(7, false, /\d/) + P(7, false, /\w/))

const godaddy = require('godaddy')({
  client_id: config.godaddy.key,
  client_secret: config.godaddy.secret
})

Godaddy = {}

const error = Error.create.bind(null, {
  http: 500,
  message: 'Godaddy Gateway Error',
  code: 'Internal'
})

Godaddy.purchaseDomain = (options, cb) => {
  const shopper = cb => Godaddy.getShopper(options.user, cb)

  const domain = (cb, results) => {
    godaddy.domain.available({
      domain: options.domain,
      checkType: godaddy.FULL
    }, (err, status) => {
      if (err)
        return cb(error(err))

      console.log(status)

      if (!status.available)
        return cb(Error.Conflict('Domain ' + options.domain + ' is not available'))

      cb(null, status)
    })
  }

  const charge = (cb, results) => {
    console.log('Charging')
    Stripe.charge({
      user: options.user,
      amount: results.domain.price,
      customer: options.stripe
    }, cb)
  }

  const purchase = (cb, results) => {
    const consent = {
      agreementKeys: options.agreement.keys,
      agreedBy: options.agreement.ip,
      agreedAt: (new Date()).toISOString()
    }

    godaddy.domain.purchase({
      consent,
      domain: options.domain,
      contactRegistrant: config.godaddy.registrant,
      contactAdmin: config.godaddy.admin,
      contactBilling: config.godaddy.billing,
      contactTech: config.godaddy.tech,
      renewAuto: false,
      period: 1,
      nameServers: config.godaddy.nameservers
    }, {
//       'X-Shopper-Id': results.shopper
    }, cb)
  }

  const order = (cb, results) => {
    godaddy.orders.getAll({}, cb)
  }

  const save = (cb, results) => {

  }

  const done = (err, results) => {
    if (err)
      return cb(err)

    cb(null, results.order)
  }

  async.auto({
    shopper,
    domain,
    charge: ['shopper', 'domain', charge],
    purchase: ['shopper', 'charge', purchase],
    order: ['purchase', order]
  }, done)
}

Godaddy.getShopper = (user_id, cb) => {
  db.query('godaddy/user/get_shopper', [
    user_id
  ], (err, res) => {
    if (err)
      return cb(err)

    if (res.rows.length > 0)
      return cb(null, res.rows[0].shopper_id)

    Godaddy.createShopper(user_id, cb)
  })
}

Godaddy.createShopper = (user_id, cb) => {
  const getUser = cb => User.get(user_id, cb)

  const createShopper = (cb, results) => {
    const options = {
      email: results.user.email,
      nameFirst: results.user.first_name,
      nameLast: results.user.last_name,
      password: Password()
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
      results.shopper.shopperId
    ], cb)
  }

  const done = (err, results) => {
    if (err)
      return cb (err)

    Godaddy.getShopper(user_id, cb)
  }

  async.auto({
    user: getUser,
    shopper: ['user', createShopper],
    saved: ['shopper', save]
  }, done)
}

Godaddy.suggest = (options, cb) => {
  godaddy.domain.suggest(options, (err, domains) => {
    if (err)
      return cb(err)

    async.map(domains, Godaddy.available, (err, availables) => {
      if (err)
        return cb(err)

      const results = availables
        .filter( d => d.available && d.definitive )

      cb(null, results)
    })
  })
}

Godaddy.available = (domain, cb) => {
  godaddy.domain.available({
    domain: domain,
    checkType: godaddy.FULL
  }, cb)
}

Godaddy.getAgreements = (options, cb) => {
  godaddy.domain.getAgreements(options, cb)
}