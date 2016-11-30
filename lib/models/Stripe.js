const async = require('async')
const db = require('../utils/db')
const validator = require('../utils/validator')
const config = require('../config.js')
const stripe = require('stripe')(config.stripe.key)

Stripe = {}

const stripeError = Error.create.bind(null, {
  http: 500,
  message: 'Stripe Gateway Error',
  code: 'Internal'
})

const schemas = {
  customer: {
    type: 'object',
    properties: {
      user: {
        type: 'string',
        uuid: true,
        required: true
      },

      token: {
        type: 'string',
        required: true
      }
    }
  }
}

const error = (callback) => {
  return (err, result) => {
    if (err)
      return callback(stripeError(err))

    callback(null, result)
  }
}

Stripe.charge = ({user, amount, customer}, cb) => {
  const getCustomer = cb => Stripe.getCustomer(customer, cb)

  const getUser = cb => User.get(user, cb)

  const charge = (cb, results) => {
    stripe.charges.create({
      amount,
      currency: 'usd',
      customer: results.customer.customer_id,
      description: 'foo'
    }, cb)
  }

  const authorize = (cb, results) => {
    if (results.user.id === results.customer.owner)
      return cb()

    cb(Error.Forbidden('You are now allowed to access this payment source'))
  }

  const save = (cb, results) => {
    db.query('stripe/charge/save', [
      results.user.id,
      results.customer.id,
      results.charge.amount,
      results.charge
    ], cb)
  }

  const done = (err, results) => {
    if (err)
      return cb(err)

    Stripe.getCharge(results.save.rows[0].id, cb)
  }

  async.auto({
    customer: getCustomer,
    user: getUser,
    authorize: ['customer', 'user', authorize],
    charge: ['customer', 'user', charge],
    save: ['charge', save]
  }, done)
}

Stripe.addCustomer = (options, cb) => {
  const validate = cb => {
    validator(schemas.customer, options, cb)
  }

  const create = cb => {
    stripe.customers.create({
      source: options.token,
      metadata: {
        owner: options.user
      }
    }, error(cb))
  }

  const save = (cb, results) => {
    db.query('stripe/customer/save', [
      options.user,
      results.customer.id,
      results.customer.sources.data[0]
    ], cb)
  }

  const done = (err, results) => {
    if (err) {
      console.log('Charge error', err)
      return cb(err)
    }

    Stripe.getCustomer(results.save.rows[0].id, cb)
  }

  async.auto({
    validate,
    customer: ['validate', create],
    save: ['customer', save]
  }, done)
}

Stripe.getCustomer = (customer_id, cb) => {
  db.query('stripe/customer/get', [
    customer_id
  ], (err, res) => {
    if (err)
      return cb(err)

    if (res.rows.length < 1)
      return cb(Error.ResourceNotFound('Customer ' + customer_id + ' not found'))

    cb(null, res.rows[0])
  })
}

Stripe.getCharge = (charge_id, cb) => {
  db.query('stripe/charge/get', [
    charge_id
  ], (err, res) => {
    if (err)
      return cb(err)

    if (res.rows.length < 1)
      return cb(Error.ResourceNotFound('Charge ' + charge_id + ' not found'))

    cb(null, res.rows[0])
  })
}