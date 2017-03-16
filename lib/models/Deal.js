const db = require('../utils/db.js')
const validator = require('../utils/validator.js')
const async = require('async')
const expect = validator.expect
const EventEmitter = require('events').EventEmitter
const parser = require('parse-address').parseLocation
const request = require('request')
const cheerio = require('cheerio')


Deal = new EventEmitter

Orm.register('deal', Deal)

DealRole = {}

Orm.register('deal_role', DealRole)

const schema = {
  type: 'object',

  listing: {
    type: 'string',
    uuid: true,
    required: false
  },

  created_by: {
    type: 'string',
    uuid: true,
    required: true
  },

  context: {
    type: 'object',
    required: false
  }
}

const validate = validator.bind(null, schema)

Deal.get = function (id, cb) {
  db.query('deal/get', [id], (err, res) => {
    if (err)
      return cb(err)

    if (res.rows.length < 1)
      return cb(Error.ResourceNotFound('Deal ' + id + ' not found'))

    const deal = res.rows[0]

    if (!deal.context)
      deal.context = {}

    deal.context.type = 'deal_context'

    deal.cookies = AttachedFile.getCookies(id + '/*')

    cb(null, deal)
  })
}

Deal.create = function (deal, cb) {
  const insert = cb => {
    db.query('deal/insert', [
      deal.created_by,
      deal.listing,
      deal.context
    ], cb)
  }

  const get = (cb, results) => {
    Deal.get(results.insert.rows[0].id, cb)
  }

  const scrape = (cb, results) => {
    Deal.scrape(results.deal, cb)
  }

  const done = (err, results) => {
    if (err)
      return cb(err)

    Deal.emit('deal created', results.final)

    cb(null, results.final)
  }

  Deal.expand(deal)

  async.auto({
    validate: cb => validate(deal, cb),
    insert: ['validate', insert],
    deal: ['insert', get],
    scrape: ['deal', scrape],
    final: ['scrape', get]
  }, done)
}

Deal.update = function (deal, cb) {

  const get = cb => Deal.get(deal.id, cb)

  const update = cb => {
    db.query('deal/update', [
      deal.context,
      deal.id
    ], cb)
  }

  const scrape = (cb, results) => {
    const old = results.old

    // If any of these context fields (or listing) have changed, we should scrape DCAP again
    const address_fields = [
      'street_number',
      'street_dir_prefix',
      'street_name',
      'street_suffix',
      'postal_code',
      'unit_number',
      'full_address'
    ]

    const relevantChange = address_fields.every(field => {
      return Deal.getContext(deal, field) !== Deal.getContext(old, field)
    })

    if (deal.listing === old.listing && !relevantChange)
      return cb()

    Deal.scrape(deal, cb)
  }

  const done = (err, results) => {
    if (err)
      return cb(err)

    get(cb)
  }

  Deal.expand(deal)

  async.auto({
    validate: cb => validate(deal, cb),
    old: ['validate', get],
    update: ['old', update],
    scrape: ['update', scrape]
  }, done)
}

Deal.addRole = ({user, email, first_name, last_name, deal, role, created_by}, cb) => {
  expect(deal).to.be.uuid
  expect(role).to.be.a('string')
  expect(created_by).to.be.uuid

  const getDeal = cb => {
    Deal.get(deal, cb)
  }

  const check = (cb, results) => {
    if (results.deal.created_by !== created_by)
      return cb(Error.AccessForbidden())

    cb()
  }

  const getUser = cb => {
    if (user) {
      expect(user).to.be.uuid
      User.get(user, cb)
      return
    }

    if (email) {
      expect(email).to.be.a('string')

      User.getOrCreateByEmail(email, {first_name, last_name}, cb)
      return
    }

    cb(Error.Validation('Please provide either email or user'))
  }

  const insert = (cb, results) => {
    db.query('deal/role/add', [
      created_by,
      role,
      deal,
      results.user.id
    ], cb)
  }

  const done = (err, results) => {
    if (err)
      return cb(err)

    Deal.get(deal, cb)
  }

  async.auto({
    deal: getDeal,
    check: ['deal', check],
    user: getUser,
    insert: ['deal', 'user', insert],
  }, done)
}

Deal.getUserDeals = (user_id, cb) => {
  db.query('deal/user', [
    user_id
  ], (err, res) => {
    if (err)
      return cb(err)

    async.map(res.rows.map(r => r.id), Deal.get, cb)
  })
}

Deal.getBrandDeals = (brand_id, cb) => {
  db.query('deal/brand', [
    brand_id
  ], (err, res) => {
    if (err)
      return cb(err)

    async.map(res.rows.map(r => r.id), Deal.get, cb)
  })
}


Deal.delete = (deal_id, cb) => {
  async.auto({
    get: cb => {
      Deal.get(deal_id, cb)
    },
    delete: [
      'get',
      cb => {
        db.query('deal/delete', [deal_id], cb)
      }
    ],
  }, (err, results) => {
    if(err)
      return cb(err)

    return cb()
  })
}

Deal.associations = {
  listing: {
    optional: true,
    enabled: false,
    model: 'Listing'
  },

  roles: {
    collection: true,
    model: 'DealRole'
  },

  files: {
    collection: true,
    model: 'AttachedFile'
  },

  created_by: {
    enabled: false,
    model: 'User'
  }
}

DealRole.get = (id, cb) => {
  db.query('deal/role/get', [
    id
  ], (err, res) => {
    if (err)
      return cb(err)

    if (res.rows.length < 1)
      return cb(Error.ResourceNotFound('Deal role' + id + ' not found'))

    cb(null, res.rows[0])
  })
}

Deal.limitAccess = ({user, deal_id}, cb) => {
  Deal.get(deal_id, (err, deal) => {
    if (err)
      return cb(err)

    if (user.id === deal.created_by)
      return cb()

    Brand.limitAccess({
      user: user.id,
      brand: user.brand,
      action: 'Manage-Deals'
    }, err => {
      if (err)
        return cb(err)

      Brand.isChildOf(user.brand, deal.brand, (err, is) => {
        if (err)
          return cb(err)

        if (is)
          return cb()

        cb(Error.AccessForbidden())
      })
    })
  })
}

Deal.getContext = (deal, context) => {
  if (deal.context && deal.context[context])
    return deal.context[context]

  if (deal.proposed_values && deal.proposed_values[context])
    return deal.proposed_values[context]

  return null
}

Deal.expand = deal => {
  if (deal.listing) //Its connected to MLS. Dont try extracting address info
    return

  const address = Deal.getContext(deal, 'full_address')

  const parsed = parser(address)
  if (!parsed) {
    deal.context.street_address = address
    return
  }

  const street_address = []

  if (!deal.context)
    deal.context = {}

  if (parsed.number) {
    deal.context.street_number = parsed.number
    street_address.push(parsed.number)
  }

  if (parsed.prefix) {
    deal.context.street_dir_prefix = parsed.prefix
    street_address.push(parsed.prefix)
  }

  if (parsed.street) {
    deal.context.street_name = parsed.street
    street_address.push(parsed.street)
  }

  if (parsed.type) {
    deal.context.street_suffix = parsed.type
    street_address.push(parsed.type)
  }

  deal.context.street_address = street_address.join(' ')

  if (parsed.city)
    deal.context.city = parsed.city

  if (parsed.zip)
    deal.context.postal_code = parsed.zip

  if (parsed.state)
    deal.context.state_code = parsed.state

  if (parsed.sec_unit_num)
    deal.context.unit_number = parsed.sec_unit_num
}

Deal.scrape = (deal, cb) => {
  const save = (text) => {
    if (!deal.context)
      deal.context = {}

    deal.context.legal_description = text

    Deal.update(deal, cb)
  }

  const baseurl = 'http://www.dallascad.org/'

  const cities = {
    'ADDISON': 1,
    'BALCH SPRINGS': 1,
    'CARROLLTON': 3,
    'CEDAR HILL': 6,
    'COCKRELL HILL': 7,
    'COMBINE': 9,
    'COPPELL': 10,
    'DALLAS': 12,
    'DESOTO': 15,
    'DUNCANVILLE': 16,
    'FARMERS BRANCH': 17,
    'FERRIS': 18,
    'GARLAND': 20,
    'GLENN HEIGHTS': 22,
    'GRAND PRAIRIE': 24,
    'GRAPEVINE': 28,
    'HIGHLAND PARK': 29,
    'HUTCHINS': 30,
    'IRVING': 31,
    'LANCASTER': 32,
    'LEWISVILLE': 33,
    'MESQUITE': 34,
    'NO TOWN': 37,
    'OVILLA': 38,
    'RICHARDSON': 39,
    'ROWLETT': 40,
    'SACHSE': 42,
    'SEAGOVILLE': 43,
    'SUNNYVALE': 45,
    'UNIVERSITY PARK': 46,
    'WILMER': 48,
    'WYLIE': 49
  }

  const city = Deal.getContext(deal, 'city')

  let city_id = ''

  if (city && cities[city.toUpperCase()])
    city_id = cities[city.toUpperCase()]

  console.log('Searching DCAD for', deal)

  const params = {
    method: 'POST',
    url: `${baseurl}SearchAddr.aspx`,
    form: {
      txtAddrNum: Deal.getContext(deal, 'street_number') || '',
      listStDir: Deal.getContext(deal, 'street_dir_prefix') || '',
      txtStName: Deal.getContext(deal, 'street_name') || '',
      txtBldgID: '',
      txtUnitID: Deal.getContext(deal, 'unit_number') || '',
      listCity: city_id,
      txtAddrNum1: '',
      txtAddrNum2: '',
      cmdSubmit: 'Search',
      'AcctTypeCheckList1:chkAcctType:0': 'on',
      'AcctTypeCheckList1:chkAcctType:1': 'on',
      'AcctTypeCheckList1:chkAcctType:2': 'on',
      '__EVENTVALIDATION': '/wEWNwKNxeDgBQL17Ij2DQLT2oiFCAKxtaLrBAK+taLrBAKItaLrBAK6taLrBAKxtZ71BAKxtcb1BAK+tZ71BAK+tcb1BALWwZ+aCgL9woDYDAKimtGeAQLYw+XqCwLXrM+EBwLWrM+EBwLVrM+EBwLSrM+EBwLRrM+EBwLPrM+EBwLXrI+HBwLXrIeHBwLXrLOHBwLXrLeHBwLXrKuHBwLXrO+EBwLWrI+HBwLWrIeHBwLWrL+HBwLWrO+EBwLWrOOEBwLVrI+HBwLVrIOHBwLVrIeHBwLVrLuHBwLVrL+HBwLVrKuHBwLVrO+EBwLVrOOEBwLUrI+HBwLUrIeHBwLUrLuHBwLUrLOHBwLUrLeHBwLUrO+EBwLUrOOEBwLmlMy7DgKV2fL7DwKMkP+WCAKF6padDAKF6oLCAwKF6u7mCgLq2exLAqfhpqQLyAxcEimcz78yEg2l11PhPzxIHjM=',
      '__VIEWSTATE': '/wEPDwULLTIwMDA3NTI2NjkPZBYCAgEPZBYKAg8PDxYCHgRUZXh0BQdWSUNUT1JZZGQCFQ8QDxYGHg1EYXRhVGV4dEZpZWxkBQhDaXR5TmFtZR4ORGF0YVZhbHVlRmllbGQFB0NpdHlfQ2QeC18hRGF0YUJvdW5kZ2QQFSEFW0FMTF0yQURESVNPTiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAyQkFMQ0ggU1BSSU5HUyAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAyQ0FSUk9MTFRPTiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAyQ0VEQVIgSElMTCAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAyQ09DS1JFTEwgSElMTCAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAyQ09NQklORSAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAyQ09QUEVMTCAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAyREFMTEFTICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAyREVTT1RPICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAyRFVOQ0FOVklMTEUgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAyRkFSTUVSUyBCUkFOQ0ggICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAyRkVSUklTICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAyR0FSTEFORCAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAyR0xFTk4gSEVJR0hUUyAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAyR1JBTkQgUFJBSVJJRSAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAyR1JBUEVWSU5FICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAySElHSExBTkQgUEFSSyAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAySFVUQ0hJTlMgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAySVJWSU5HICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAyTEFOQ0FTVEVSICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAyTEVXSVNWSUxMRSAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAyTUVTUVVJVEUgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAyTk8gVE9XTiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAyT1ZJTExBICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAyUklDSEFSRFNPTiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAyUk9XTEVUVCAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAyU0FDSFNFICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAyU0VBR09WSUxMRSAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAyU1VOTllWQUxFICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAyVU5JVkVSU0lUWSBQQVJLICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAyV0lMTUVSICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAyV1lMSUUgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAVIQABMQEyATMBNgE3ATkCMTACMTICMTUCMTYCMTcCMTgCMjAC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'
    }
  }

  let text
  const searchResults = (err, res, body) => {
    if (err)
      return cb(err)

    const $ = cheerio.load(body)
    const $links = $('#SearchResults1_dgResults tr a')
    if ($links.length > 1) {
      return save(`We tried searching <a target="_blank" href="http://www.dallascad.org/SearchAddr.aspx">DCAD</a> for this listing but found more than one matching result.
      Setting the full adress of the listing, including unit number, helps us find the proper listing automatically.`)
    }

    if ($links.length < 1) {
      return save('We could not find any listing on <a target="_blank" href="http://www.dallascad.org/SearchAddr.aspx">DCAD</a> with provided information')
    }

    const href = baseurl + $links.attr('href')
    text = `Legal description automatically pulled <a target="_blank" href="${href}">from DCAD:</a><br><br>`

    request(href, scrapeResult)
  }

  const scrapeResult = (err, res, body) => {
    if (err)
      return save('Error while fetching DCAD results page')

    const $ = cheerio.load(body)
    const $table = $('#lblLegalDesc').parents('.HalfCol')
    text += $table.html()
    save(text)
  }

  request(params, searchResults)
}

DealRole.associations = {
  user: {
    enabled: true,
    model: 'User'
  }
}

module.exports = function () {}
