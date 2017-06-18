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

  const query = req.query.q

  expect(query).to.be.a('string')

  const options = {
    limit: 15
  }

  options.query = query
  expect(query).to.be.a('string')
  options.tlds = [...listing_tlds, ...agent_tlds].join(',')
  suggest(options)
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
