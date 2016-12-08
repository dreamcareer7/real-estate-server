const expect = require('../utils/validator').expect

function purchaseDomain(req, res) {
  const options = {
    domain: req.body.domain,
    user: req.user.id,
    stripe: req.body.stripe,
    agreement: req.body.agreement
  }

  Godaddy.purchaseDomain(options, (err, domain) => {
    if (err)
      return res.error(err)

    res.model(domain)
  })
}

const listing_tlds = [
  'com',
  'info',
  'apartments',
  'condos',
  'house',
  'estate',
  'forsale',
  'least',
  'mortgage',
  'place',
  'properties',
  'property',
  'rent',
  'rentals',
  'sale',
  'studio',
  'villas'
]

const agent_tlds = [
  'com',
  'info',
  'realtor',
  'realestate'
]

function suggest(req, res) {
  const suggest = options => {
    Godaddy.suggest(options, (err, domains) => {
      if (err)
        return res.error(err)

      res.collection(domains)
    })
  }

  const listing = req.query.listing
  const query = req.query.q

  const options = {
    limit: 15
  }

  if (listing) {
    expect(listing).to.be.uuid

    Listing.get(listing, (err, listing) => {
      if (err)
        res.error(err)

      options.city = listing.property.address.city

      options.query = [
        listing.property.address.street_number,
        listing.property.address.street_name,
      ]
      .filter(Boolean)
      .join(' ')

      options.tlds = [...listing_tlds].join(',')

      options.city = listing.property.address.city

      suggest(options)
    })
  } else if (query) {
    options.query = query
    expect(query).to.be.a('string')
    options.tlds = [...listing_tlds, ...agent_tlds].join(',')
    suggest(options)
  } else {
    options.query = [
      req.user.first_name,
      req.user.last_name
    ]
    options.tlds = [...agent_tlds].join(',')
    suggest(options)
  }
}

const getAgreements = (req, res) => {
  const domain = req.query.domain

  expect(domain).to.be.a('string')

  if (!domain)
    res.error(Error.Validation('Please provide domain name'))

  const options = {
    tlds: domain.split('.').pop(),
    privacy: false
  }

  Godaddy.getAgreements(options, (err, agreements) => {
    if (err)
      res.error(err)

    res.collection(agreements)
  })
}

const router = function (app) {
  const b = app.auth.bearer

  app.post('/domains', b(purchaseDomain))
  app.get('/domains/suggest', b(suggest))
  app.get('/domains/agreements', getAgreements)
}

module.exports = router
