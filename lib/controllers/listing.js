const async = require('async')
const _u = require('underscore')
const validator = require('../utils/validator.js')
const expect = validator.expect

const schema_listing_inquiry = {
  type: 'object',
  properties: {
    agent: {
      type: 'string',
      uuid: true,
      required: false
    },
    listing: {
      type: 'string',
      uuid: true,
      required: true
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

function getListing (req, res) {
  expect(req.params.id).to.be.uuid

  Listing.get(req.params.id, function (err, listing) {
    if (err)
      return res.error(err)

    if (!listing) {
      res.status(404)
      return res.end()
    }

    return res.model(listing)
  })
}

function searchListings (req, res) {
  if (req.query.mui) {
    const mui = req.query.mui

    expect(mui).to.be.mui

    return Listing.getByMUI(mui, (err, listing) => {
      if (err)
        return res.error(err)

      return res.model(listing)
    })
  }

  if (req.query.mls_number) {
    const mls_number = req.query.mls_number

    expect(mls_number).to.be.mlsid

    return Listing.getByMLSNumber(mls_number, (err, listing) => {
      if (err)
        return res.error(err)

      return res.model(listing)
    })
  }

  if (req.query.q) {
    expect(req.query.q).to.be.a('string').and.to.have.length.above(2)

    return Listing.getStatuses((err, allStatuses) => {
      if(err)
        return res.error(err)

      const status = req.query.status || allStatuses

      expect(status).to.be.a('array')
      if (!_u.isEqual(_u.intersection(status, allStatuses), status))
        return res.error(Error.Validation(`Status can only be the following: ${allStatuses.join(',')}`))

      // .filter( state => state !== 'Leased' )
      // .filter( state => state !== 'Sold' );

      Listing.stringSearch(req.query.q, status, function (err, listings) {
        if (err)
          return res.error(err)

        return res.collection(listings)
      })
    })
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

const router = function (app) {
  const b = app.auth.bearer

  app.get('/areas/search', searchAreas)
  app.get('/counties/search', searchCounties)
  app.get('/subdivisions/search', searchSubdivisions)

  app.get('/listings/search', searchListings)
  app.get('/listings/:id', getListing)
  app.post('/listings/:id/inquiry', b(listingInquiry))
}

module.exports = router
