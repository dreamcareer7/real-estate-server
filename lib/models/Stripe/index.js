const async = require('async')
const db = require('../../utils/db')
const validator = require('../../utils/validator')
const config = require('../../config.js')

const stripe = process.env.NODE_ENV === 'tests' ? require('./mock') : require('stripe')(config.stripe.key)

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
    }, error(cb))
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
    }, cb)
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

Stripe.deleteCustomer = (customer_id, cb) => {
  db.query('stripe/customer/delete', [customer_id], cb)
}

Stripe.getCustomer = (customer_id, cb) => {
  Stripe.getAllCustomers([customer_id], (err, customers) => {
    if(err)
      return cb(err)

    if (customers.length < 1)
      return cb(Error.ResourceNotFound('Customer ' + customer_id + ' not found'))

    const customer = customers[0]

    return cb(null, customer)
  })
}

Stripe.getAllCustomers = (customer_ids, cb) => {
  db.query('stripe/customer/get', [customer_ids], (err, res) => {
    if (err)
      return cb(err)

    const customers = res.rows

    return cb(null, customers)
  })
}

Stripe.getUserCustomers = (user_id, cb) => {
  db.query('stripe/customer/get_user', [
    user_id
  ], (err, res) => {
    if (err)
      return cb(err)

    Stripe.getAllCustomers(res.rows.map(r => r.id), cb)
  })
}

Stripe.getCharge = (charge_id, cb) => {
  Stripe.getAllCharges([charge_id], (err, charges) => {
    if(err)
      return cb(err)

    if (charges.length < 1)
      return cb(Error.ResourceNotFound('Charge ' + charge_id + ' not found'))

    const charge = charges[0]

    return cb(null, charge)
  })
}

Stripe.getAllCharges = (charge_ids, cb) => {
  db.query('stripe/charge/get', [charge_ids], (err, res) => {
    if (err)
      return cb(err)

    const charges = res.rows

    return cb(null, charges)
  })
}
