const _ = require('underscore')

registerSuite('alert', ['create'])

const recommendation_response = require('./expected_objects/recommendation.js')
const info_response = require('./expected_objects/info.js')
const uuid = require('uuid')

const feed = (cb) => {
  return frisby.create('get feed')
    .get('/rooms/' + results.room.create.data.id + '/recs/feed')
    .after(cb)
    .expectStatus(200)
    .expectJSON({
      code: 'OK',
      data: [
        {
          type: 'recommendation'
        }
      ],
      info: {}
    })
    .expectJSONTypes({
      code: String,
      data: [recommendation_response],
      info: info_response
    })
}


const getFavorites = (cb) => {
  return frisby.create('get favorites')
    .get('/rooms/' + results.room.create.data.id + '/recs/favorites')
    .after(cb)
    .expectStatus(200)
    .expectJSON({
      code: 'OK',
      data: [],
      info: {
        count: 0,
        total: 0
      }
    })
    .expectJSONLength('data', 0)
    .expectJSONTypes({
      code: String,
      data: Array,
      info: info_response
    })
}

const getFavorites404 = (cb) => {
  return frisby.create('expect 404 with invalid room id')
    .get('/rooms/' + uuid.v1() + '/recs/favorites')
    .after(cb)
    .expectStatus(404)
}

const markAsFavorite = (cb) => {
  return frisby.create('favorite a rec')
    .patch('/rooms/' + results.room.create.data.id + '/recs/' + results.recommendation.feed.data[0].id + '/favorite', {
      favorite: true
    })
    .after(cb)
    .expectStatus(200)
    .expectJSON({
      code: 'OK',
      data: {
        type: 'recommendation',
        favorited_by: [{
          id: results.authorize.token.data.id
        }],
      }
    })
    .expectJSONTypes({
      code: String,
      data: recommendation_response
    })
}

const markAsHid = (cb) => {
  return frisby.create('hide a rec')
    .patch('/rooms/' + results.room.create.data.id + '/recs/' + results.recommendation.feed.data[0].id + '/hid', {
      hid: true
    })
    .after(cb)
    .expectStatus(200)
    .expectJSON({
      code: 'OK',
      data: {
        type: 'recommendation',
        favorited_by: [{
          id: results.authorize.token.data.id
        }],
      }
    })
    .expectJSONTypes({
      code: String,
      data: recommendation_response
    })
}

const markAsFavorite404 = (cb) => {
  return frisby.create('expect 404 with invalid recommendation id')
    .patch('/rooms/' + results.room.create.data.id + '/recs/' + uuid.v1() + '/favorite', {
      favorite: true
    })
    .after(cb)
    .expectStatus(404)
}

const markAsFavoriteWorked = (cb) => {
  const expect = _.clone(results.recommendation.feed.data[0])
  expect.favorited_by = [{
    id: results.authorize.token.data.id
  }]
  expect.listing.favorited = true // Its now marked as favorited. This should be true now.

  return frisby.create('make sure favorite was successful')
    .get('/rooms/' + results.room.create.data.id + '/recs/favorites')
    .after(cb)
    .expectStatus(200)
    .expectJSON({
      code: 'OK',
      data: [expect],
      info: {
        count: 1,
        total: 1
      }
    })
    .expectJSONLength('data', 1)
    .expectJSONTypes({
      code: String,
      data: [recommendation_response],
      info: info_response
    })
}

const markAsSeen = (cb) => {
  const rec = _.clone(results.recommendation.feed.data[0])
  rec.read_by = [results.authorize.token.data.id]

  // These are only present when recommendation is part of a collection
  delete rec.comment_count
  delete rec.document_count
  delete rec.video_count
  delete rec.image_count

  return frisby.create('mark a rec as seen')
    .delete('/rooms/' + results.room.create.data.id + '/recs/feed/' + results.recommendation.feed.data[0].id)
    .after(cb)
    .expectStatus(200)
    .expectJSON({
      code: 'OK',
      data: rec
    })
    .expectJSONTypes({
      code: String,
      data: recommendation_response
    })
}

const markAsSeen404 = (cb) => {
  return frisby.create('expect 404 with invalid recommendation id')
    .delete('/rooms/' + results.room.create.data.id + '/recs/feed/' + uuid.v1())
    .after(cb)
    .expectStatus(404)
}

const recommendManually = (cb) => {
  return frisby.create('recommend manually')
    .post('/rooms/' + results.room.create.data.id + '/recs', {
      mls_number: results.recommendation.markAsSeen.data.listing.mls_number,
      notification: true
    })
    .after(cb)
    .expectStatus(200)
    .expectJSON({
      code: 'OK',
      data: {
        type: 'recommendation'
      }
    })
    .expectJSONTypes({
      code: String,
      data: recommendation_response
    })
}

const recommendManuallybyListingId = (cb) => {
  return frisby.create('recommend manually by listing ID')
    .post('/rooms/' + results.room.create.data.id + '/recs', {
      listing_id: results.recommendation.markAsSeen.data.listing.id,
      notification: true
    })
    .after(cb)
    .expectStatus(200)
    .expectJSON({
      code: 'OK',
      data: {
        type: 'recommendation'
      }
    })
    .expectJSONTypes({
      code: String,
      data: recommendation_response
    })
}

const recommendManuallyWorked = (cb) => {
  return frisby.create('make sure recommendManually was successful')
    .get('/rooms/' + results.room.create.data.id + '/recs/' + results.recommendation.feed.data[0].id)
    .after(cb)
    .expectStatus(200)
    .expectJSON({
      code: 'OK',
      data: {
        type: 'recommendation'
      }
    })
    .expectJSONTypes({
      code: String,
      data: recommendation_response
    })
}

const bulkMarkAsRead = (cb) => {
  return frisby.create('mark read in bulk')
    .delete('/rooms/' + results.room.create.data.id + '/recs/feed')
    .after(cb)
    .expectStatus(204)
}

const getFavoritedListings = (cb) => {
  return frisby.create('get favorited listings')
    .get('/user/favorites/')
    .after(cb)
    .expectStatus(200)
}

module.exports = {
  feed,
  getFavorites,
  getFavorites404,
  markAsFavorite,
  markAsHid,
  markAsFavorite404,
  markAsFavoriteWorked,
  markAsSeen,
  markAsSeen404,
  recommendManually,
  recommendManuallybyListingId,
  recommendManuallyWorked,
  bulkMarkAsRead,
  getFavoritedListings
}
