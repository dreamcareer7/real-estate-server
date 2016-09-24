const _ = require('underscore')

registerSuite('alert', ['create'])

const recommendation_response = require('./expected_objects/recommendation.js')
const info_response = require('./expected_objects/info.js')
const uuid = require('node-uuid')

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

const feed404 = (cb) => {
  return frisby.create('expect 404 with invalid room id')
    .get('/rooms/' + uuid.v1() + '/recs/feed')
    .after(cb)
    .expectStatus(404)
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

const getTours = (cb) => {
  return frisby.create('get tours')
    .get('/rooms/' + results.room.create.data.id + '/recs/tours')
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

const getTours404 = (cb) => {
  return frisby.create('expect 404 with invalid room id')
    .get('/rooms/' + uuid.v1() + '/recs/tours')
    .after(cb)
    .expectStatus(404)
}

const getActives = (cb) => {
  return frisby.create('get actives')
    .get('/rooms/' + results.room.create.data.id + '/recs/actives')
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

const getActives404 = (cb) => {
  return frisby.create('expect 404 with invalid room id')
    .get('/rooms/' + uuid.v1() + '/recs/actives')
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
        favorited_by: [results.authorize.token.data]
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
  expect.favorited_by = [results.authorize.token.data]
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

const markAsTour = (cb) => {
  return frisby.create('tour a rec')
    .patch('/rooms/' + results.room.create.data.id + '/recs/' + results.recommendation.feed.data[0].id + '/tour', {
      tour: true
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

const markAsTour404 = (cb) => {
  return frisby.create('expect 404 with invalid recommendation id')
    .patch('/rooms/' + results.room.create.data.id + '/recs/' + uuid.v1() + '/tour', {
      tour: true
    })
    .after(cb)
    .expectStatus(404)
}

const markAsTourWorked = (cb) => {
  return frisby.create('get tours')
    .get('/rooms/' + results.room.create.data.id + '/recs/tours')
    .after(cb)
    .expectStatus(200)
    .expectJSON({
      code: 'OK',
      data: [],
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

const seen = (cb) => {
  return frisby.create('get seen')
    .get('/rooms/' + results.room.create.data.id + '/recs/seen')
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

const seen404 = (cb) => {
  return frisby.create('expect 404 with invalid room id')
    .get('/rooms/' + uuid.v1() + '/recs/seen')
    .after(cb)
    .expectStatus(404)
}

const markAsSeen = (cb) => {
  const rec = _.clone(results.recommendation.feed.data[0])

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

const markAsSeenWorked = (cb) => {
  return frisby.create('make sure marking one as seen worked just fine')
    .get('/rooms/' + results.room.create.data.id + '/recs/seen')
    .after(cb)
    .expectStatus(200)
    .expectJSON({
      code: 'OK',
      info: {
        count: 1,
        total: 1
      },
      data: [results.recommendation.feed.data[0]]
    })
    .expectJSONLength('data', 1)
    .expectJSONTypes({
      code: String,
      data: [recommendation_response],
      info: info_response
    })
}

const recommendManually = (cb) => {
  return frisby.create('recommend manually')
    .post('/rooms/' + results.room.create.data.id + '/recs', {
      mls_number: results.recommendation.markAsSeenWorked.data[0].listing.mls_number
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

const recommendManually400 = (cb) => {
  return frisby.create('expect 400 with invalid mls number')
    .post('/rooms/' + results.room.create.data.id + '/recs', {
      mls_number: 1
    })
    .after(cb)
    .expectStatus(400)
}

const recommendManually404 = (cb) => {
  return frisby.create('expect 400 with invalid mls number')
    .post('/rooms/' + results.room.create.data.id + '/recs', {
      mls_number: uuid.v1()
    })
    .after(cb)
    .expectStatus(404)
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

module.exports = {
  feed,
  feed404,
  getFavorites,
  getFavorites404,
  getTours,
  getTours404,
  getActives,
  getActives404,
  markAsFavorite,
  markAsFavorite404,
  markAsFavoriteWorked,
  markAsTour,
  markAsTour404,
  markAsTourWorked,
  seen,
  seen404,
  markAsSeen,
  markAsSeen404,
  markAsSeenWorked,
  recommendManually,
  recommendManually400,
  recommendManually404,
  recommendManuallyWorked
}
