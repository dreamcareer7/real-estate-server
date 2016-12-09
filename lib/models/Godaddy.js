const async = require('async')
const db = require('../utils/db')
const config = require('../config.js')
const P = require('password-generator')
const AWS = require('aws-sdk')
const r53 = new AWS.Route53({apiVersion: '2013-04-01'})
const uuid = require('node-uuid')

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

      if (!status.available && !status.definitive)
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
      'X-Shopper-Id': results.shopper
    }, cb)
  }

  const zone = (cb, result) => {
    const params = {
      CallerReference: uuid.v1(),
      Name: options.domain,
    }

    r53.createHostedZone(params, (err, res) => {
      if (err)
        return cb(Error.Amazon('Error while creating Route 53 Hosted Zone: ' + err))

      cb(null, res)
    })
  }

  const recordset = (cb, results) => {
    const params = {
      HostedZoneId: results.zone.HostedZone.Id,
      ChangeBatch: {
        Changes: [
          {
            Action: 'UPSERT',
            ResourceRecordSet: {
              Name: options.domain,
              Type: 'A',
              TTL: 3600,
              ResourceRecords: [
                {
                  Value: config.godaddy.ipv4
                }
              ],
            }
          },
          {
            Action: 'UPSERT',
            ResourceRecordSet: {
              Name: options.domain,
              Type: 'AAAA',
              TTL: 3600,
              ResourceRecords: [
                {
                  Value: config.godaddy.ipv6
                }
              ],
            }
          },
          {
            Action: 'UPSERT',
            ResourceRecordSet: {
              Name: 'www.' + options.domain,
              Type: 'A',
              TTL: 3600,
              ResourceRecords: [
                {
                  Value: config.godaddy.ipv4
                }
              ],
            }
          },
          {
            Action: 'UPSERT',
            ResourceRecordSet: {
              Name: 'www.' + options.domain,
              Type: 'AAAA',
              TTL: 3600,
              ResourceRecords: [
                {
                  Value: config.godaddy.ipv6
                }
              ],
            }
          }
        ]
      }
    }

    r53.changeResourceRecordSets(params, (err, res) => {
      if (err)
        return cb(Error.Amazon('Error while setting recordsets: ' + err))

      cb(null, res)
    })
  }

//   const order = (cb, results) => {
//     godaddy.orders.get(results.purchase.orderId, cb)
//   }

  const save = (cb, results) => {
    db.query('godaddy/domain/save', [
      options.domain,
      options.user,
      results.purchase.orderId
    ], (err, res) => {
      if (err)
        return cb(err)

      Godaddy.getDomain(res.rows[0].id, cb)
    })
  }

  const done = (err, results) => {
    if (err)
      return cb(err)

    cb(null, results.save)
  }

  async.auto({
    shopper,
    domain,
    charge: ['shopper', 'domain', charge],
    zone: ['charge', zone],
    purchase: ['shopper', 'charge', 'zone', purchase],
    recordset: ['zone', recordset],
    save: ['purchase', save]
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


    godaddy.domain.bulkAvailable(domains, (err, res) => {
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

Godaddy.getDomain = (domain_id, cb) => {
  db.query('godaddy/domain/get', [
    domain_id
  ], (err, res) => {
    if (err)
      return cb(err)

    if (res.rows.length < 1)
      return cb(Error.ResourceNotFound('Cannot find domain ' + domain_id))

    cb(null, res.rows[0])
  })
}

Godaddy.getAgreements = (options, cb) => {
  godaddy.domain.getAgreements(options, cb)
}