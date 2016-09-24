const async = require('async')
const validator = require('../utils/validator.js')

const schema_listing_inquiry = {
  type:       'object',
  properties: {
    agent: {
      type:     'string',
      uuid:     true,
      required: false
    },
    listing: {
      type:     'string',
      uuid:     true,
      required: true
    },
    brand: {
      type:     'string',
      uuid:     true,
      required: true
    },
    source_type: {
      type:     'string',
      required: true,
      enum:     [
        'BrokerageWidget',
        'IOSAddressBook',
        'SharesRoom',
        'ExplicitlyCreated'
      ]
    }
  }
}

function getListing (req, res) {
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

    return Listing.getByMUI(mui, function (err, listing) {
      if (err)
        return res.error(err)

      return res.model(listing)
    })
  }

  if (req.query.mls_number) {
    const mls_number = req.query.mls_number

    return Listing.getByMLSNumber(mls_number, function (err, listing) {
      if (err)
        return res.error(err)

      return res.model(listing)
    })
  }

  if (req.query.q && req.query.q.match(/[A-z]{3,}|[0-9]{5,}/)) {
    return Listing.getStatuses((err, allStatuses) => {
      const status = req.query.status ? ObjectUtil.queryStringArray(req.query.status) : allStatuses

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

function getSimilars (req, res) {
  Listing.getSimilars(req.params.mls_number, (err, similars) => {
    if (err)
      return res.error(err)

    return res.collection(similars)
  })
}

function listingInquiry (req, res) {
  const r = req.body
  const user_id = req.user.id
  const listing_id = req.params.id

  const external_info = {
    ref_user_id:  user_id,
    source:       'MLS',
    source_url:   'https://mls.org',
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

  const parents = req.query.parents ? ObjectUtil.queryStringArray(req.query.parents) : null

  if (!term && !parents)
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
  let term = req.query.q
  if (term && term.length < 3)
    term = null

  if (!term)
    res.error(Error.Validation('Supply a query'))

  Listing.searchSubdivisions(term, (err, subdivisions) => {
    if (err)
      return res.error(err)

    res.collection(subdivisions)
  })
}

const facebook = (req, res) => {
  Listing.facebookShare({
    message: req.body.message,
    photo:   req.body.photo,
    listing: req.params.id,
    user:    req.user.id
  }, (err) => {
    if (err)
      res.error(err)

    res.end()
  })
}

const router = function (app) {
  const b = app.auth.bearer

  app.get('/areas/search', app.auth.optionalBearer(searchAreas))
  app.get('/counties/search', app.auth.optionalBearer(searchCounties))
  app.get('/subdivisions/search', app.auth.optionalBearer(searchSubdivisions))

  app.get('/listings/search', app.auth.optionalBearer(searchListings))
  app.get('/listings/:mls_number/similars', b(getSimilars))
  app.get('/listings/:id', app.auth.optionalBearer(getListing))
  app.post('/listings/:id/inquiry', b(listingInquiry))
  app.post('/listings/:id/facebook', b(facebook))
}

module.exports = router
