const async = require('async')
const validator = require('../utils/validator.js')
const expect = validator.expect

const bulk_recommend = {
  type: 'object',
  properties: {
    mls_number: {
      type: 'string',
      required: true
    },
    source: {
      type: 'string',
      required: false
    },
    source_url: {
      type: 'string',
      required: false
    },
    notification: {
      type: 'boolean',
      required: false
    },
    message: {
      type: 'object',
      required: false
    },
    emails: {
      type: 'array',
      required: false,
      minItems: 1,
      items: {
        type: 'string',
        format: 'email'
      }
    },
    phone_numbers: {
      type: 'array',
      required: false,
      minItems: 1,
      items: {
        type: 'string',
        phone: true
      }
    },
    users: {
      type: 'array',
      required: false,
      minItems: 1,
      items: {
        type: 'string',
        uuid: true
      }
    },
    rooms: {
      type: 'array',
      required: false,
      minItems: 1,
      items: {
        type: 'string',
        uuid: true
      }
    }
  }
}

function getRecommendation (req, res) {
  expect(req.params.id).to.be.uuid

  Recommendation.get(req.params.id, function (err, recommendation) {
    if (err)
      return res.error(err)

    if (!recommendation)
      return res.error(Error.ResourceNotFound('Recommendation not found'))

    return res.model(recommendation)
  })
}

function getRecommendationsSet (req, res, set) {
  const user_id = req.user.id
  const room_id = req.params.id
  const paging = {}
  req.pagination(paging)

  Recommendation.getSetForUserOnRoom(set, user_id, room_id, paging, function (err, recommendations) {
    if (err)
      return res.error(err)

    return res.collection(recommendations)
  })
}

// Populates the feed response for user
function getFeed (req, res) {
  getRecommendationsSet(req, res, 'feed')
}

function getFavorites (req, res) {
  getRecommendationsSet(req, res, 'favorites')
}

function getTours (req, res) {
  getRecommendationsSet(req, res, 'tours')
}

// Populates the active recommendations response for user
function getActives (req, res) {
  getRecommendationsSet(req, res, 'actives')
}

// Populates the already seen recommendations response for user
function getSeen (req, res) {
  getRecommendationsSet(req, res, 'seen')
}

function getActivesUser (req, res) {
  getRecommendationsSet(req, res, 'actives')
}

function getFavoritedListings (req, res) {
  Recommendation.getUserFavorites(req.user.id, (err, mls_numbers) => {
    if (err)
      return res.error(err)

    res.json(mls_numbers)
  })
}

// Mark a recommendation as read for a user on a room
function patch (property, req, res) {
  const user_id = req.user.id
  const recommendation_id = req.params.id
  const action = Boolean(req.body[property])
  const notify = req.body.notification || true

  expect(recommendation_id).to.be.uuid

  Recommendation.patch(property, action, user_id, recommendation_id, notify, function (err, recommendation) {
    if (err)
      return res.error(err)

    return res.model(recommendation)
  })
}

function patchRead (req, res) {
  req.body.read = true
  return patch('read', req, res)
}

function patchFavorite (req, res) {
  return patch('favorite', req, res)
}

function patchTourRequest (req, res) {
  return patch('tour', req, res)
}

function recommendManually (req, res) {
  const room_id = req.params.id
  const mls_number = req.body.mls_number
  const external_info = {
    ref_user_id: req.user.id,
    source: req.body.source,
    source_url: req.body.source_url,
    notification: req.body.notification ? 'Share' : 'None'
  }

  expect(room_id).to.be.uuid
  expect(mls_number).to.be.mlsid

  validator(bulk_recommend, req.body, function (err) {
    if (err)
      return res.error(err)
    Listing.getByMLSNumber(mls_number, function (err, listing) {
      if (err)
        return res.error(err)

      Room.recommendListing(room_id, listing.id, external_info, function (err, rec) {
        if (err)
          return res.error(err)

        return res.model(rec)
      })
    })
  })
}

const bulkMarkAs = function (req, res) {
  const mark = function (payload, cb) {
    if (payload.action !== 'read' && payload.action !== 'favorite')
      return cb(Error.Validation('Action `' + payload.action + '` not defined'))

    const action = payload.delete ? false : true

    Recommendation.patch(payload.action, action, req.user.id, payload.recommendation, false, cb)
  }

  async.map(req.body.recommendations, mark, (err, recs) => {
    if (err)
      return res.error(err)

    res.collection(recs)
  })
}

const router = function (app) {
  const b = app.auth.bearer

  app.post('/rooms/:id/recs', b(recommendManually))

  // Mark a series of recommendations as [un](read|favorite)
  app.patch('/recs/mark', b(bulkMarkAs))

  // Endpoint to get the feed for a user on a room
  app.get('/rooms/:id/recs/feed', b(getFeed))

  // Endpoint to get favorites for a user on a room
  app.get('/rooms/:id/recs/favorites', b(getFavorites))

  // Endpoint to get tours for a user on a room
  app.get('/rooms/:id/recs/tours', b(getTours))

  // Endpoint to get the active recommendations for a user on a room
  app.get('/rooms/:id/recs/actives', b(getActives))
  app.get('/recs/actives', b(getActivesUser))

  // Endpoint to get the already seen recommendations for a user on a room
  app.get('/rooms/:id/recs/seen', b(getSeen))

  // Endpoint to get a recommendation
  app.get('/rooms/:rid/recs/:id', b(getRecommendation))

  // Endpoint to mark a recommendation as read for a user on a room
  app.delete('/rooms/:rid/recs/feed/:id', b(patchRead))

  // Endpoint to make favorite/unfavorite a recommendation for a user on a room
  app.patch('/rooms/:rid/recs/:id/favorite', b(patchFavorite))

  // Endpoint to make tour/untour a recommendation for a user on a room
  app.patch('/rooms/:rid/recs/:id/tour', b(patchTourRequest))

  // List of listings favorited by a user, ever
  app.get('/user/favorites', b(getFavoritedListings))
}

module.exports = router
