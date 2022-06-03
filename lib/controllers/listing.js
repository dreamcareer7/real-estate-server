const async = require('async')
const validator = require('../utils/validator.js')
const expect = validator.expect
const { Listing } = require('../models/Listing')
// const { access: checkListingAccess } = require('../models/Listing/access')
const ListingSetting = require('../models/Listing/setting')
const Orm = require('../models/Orm/context')
const promisify = require('../utils/promisify')
const am = require('../utils/async_middleware')
const limiter = require('../utils/rate-limiter')

const schema_listing_inquiry = {
  type: 'object',
  properties: {
    agent: {
      type: 'string',
      uuid: true,
      required: false
    },
    brand: {
      type: 'string',
      uuid: true,
      required: true
    },
    source_type: {
      type: 'string',
      required: true,
      enum: [
        'BrokerageWidget',
        'IOSAddressBook',
        'SharesRoom',
        'ExplicitlyCreated'
      ]
    }
  }
}

async function getListing (req, res) {
  expect(req.params.id).to.be.uuid

  Orm.setAssociationConditions({
    'property.address': {
      get_private_address: false
    }
  })

  // const accessible_ids = await checkListingAccess([req.params.id], req.user?.agent)
  // if (!accessible_ids.includes(req.params.id)) {
  //   throw Error.ResourceNotFound('The requested listing could not be found.')
  // }

  const listing = await promisify(Listing.get)(req.params.id)
  return res.model(listing)
}

async function searchListings (req, res) {
  Orm.setAssociationConditions({
    'property.address': {
      get_private_address: false
    }
  })

  if (req.query.mls_number) {
    const mls_number = req.query.mls_number ? req.query.mls_number.trim() : null

    expect(mls_number).to.be.mlsid

    const listings = await Listing.getByMLSNumber(mls_number)
    // const accessible_ids = await checkListingAccess(listings.map(l => l.id), req.user?.agent)
  
    return res.collection(listings)
  }

  if (req.query.q) {
    const query = req.query.q
    const limit = parseInt(req.query.limit) || 75

    expect(query).to.be.a('string').and.to.have.length.above(2)

    if (limit)
      expect(limit).to.be.a('number')

    const { status } = req.query

    if (status)
      expect(status).to.be.a('array')

    const listings = await Listing.stringSearch({query, status, limit})
    // const accessible_ids = await checkListingAccess(listings.map(l => l.id), req.user?.agent)
  
    return res.collection(listings)
  }

  return res.error(Error.MethodNotAllowed())
}

function listingInquiry (req, res) {
  const r = req.body
  const user_id = req.user.id
  const listing_id = req.params.id

  expect(listing_id).to.be.uuid

  const external_info = {
    ref_user_id: user_id,
    source: 'MLS',
    source_url: 'https://mls.org',
    notification: 'Share'
  }

  async.auto({
    validate: cb => {
      return validator(schema_listing_inquiry, r, cb)
    },
    do: [
      'validate',
      (cb, results) => {
        return Listing.inquiry(
          user_id,
          listing_id,
          r.agent,
          r.brand,
          r.source_type,
          external_info,
          cb
        )
      }
    ]
  }, (err, results) => {
    if (err)
      return res.error(err)

    res.status(204)
    return res.end()
  })
}

const searchAreas = (req, res) => {
  let term = req.query.q

  if (term)
    expect(term).to.be.a('string')

  if (term && term.length < 3)
    term = null

  const parents = req.query.parents || null

  if (parents)
    expect(parents).to.be.a('array').to.have.length.above(0)

  if (!term && (!parents || parents.length < 1))
    res.error(Error.Validation('Supply a query or parent'))

  Listing.searchAreas(term, parents, (err, areas) => {
    if (err)
      return res.error(err)

    res.collection(areas)
  })
}

const searchCounties = (req, res) => {
  const term = req.query.q

  Listing.searchCounties(term, (err, counties) => {
    if (err)
      return res.error(err)

    res.collection(counties)
  })
}

const searchSubdivisions = (req, res) => {
  const term = req.query.q

  expect(term).to.be.a('string').and.to.have.length.above(2)

  Listing.searchSubdivisions(term, (err, subdivisions) => {
    if (err)
      return res.error(err)

    res.collection(subdivisions)
  })
}

async function setStatus(req, res) {
  const userID = req.user.id
  const listingID = req.params.id
  const status = req.body.status

  expect(userID).to.be.uuid
  expect(listingID).to.be.uuid
  expect(status).to.be.an('array')
  
  await ListingSetting.update(userID, listingID, status)
  const listing = await promisify(Listing.get)(listingID)
  res.model(listing)
}

const router = function (app) {
  const b = app.auth.bearer

  app.get('/areas/search', searchAreas)
  app.get('/counties/search', searchCounties)
  app.get('/subdivisions/search', searchSubdivisions)

  app.get('/listings/search', limiter, am(searchListings))
  app.get('/listings/:id', am(getListing))
  app.post('/listings/:id/inquiry', b(listingInquiry))
  app.patch('/listings/:id/status', b.middleware, am(setStatus))
}

module.exports = router
