var _ = require('underscore');

registerSuite('alert', ['create']);

var recommendation_response = require('./expected_objects/recommendation.js');
var info_response = require('./expected_objects/info.js');

var feed = (cb) => {
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
    });
    //.expectJSONTypes({
    //  code: String,
    //  data: [recommendation_response],
    //  info: info_response
    //});
}

var getFavorites = (cb) => {
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
    });
}

var getTours = (cb) => {
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
    });
}

var getActives = (cb) => {
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
    });
}

var markAsFavorite = (cb) => {
  return frisby.create('favorite a rec')
    .patch('/rooms/' + results.room.create.data.id + '/recs/' + results.recommendation.feed.data[0].id + '/favorite', {
      favorite: true
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
    });
}

var markAsFavoriteWorked = (cb) => {
  return frisby.create('make sure favorite was successful')
    .get('/rooms/' + results.room.create.data.id + '/recs/favorites')
    .after(cb)
    .expectStatus(200)
    .expectJSON({
      code: 'OK',
      data: [results.recommendation.feed.data[0]],
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
    });
}

var markAsTour = (cb) => {
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
    });
}

var markAsTourWorked = (cb) => {
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
    });
}

var seen = (cb) => {
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
    });
}

var markAsSeen = (cb) => {
  var rec = _.clone(results.recommendation.feed.data[0]);

  //These are only present when recommendation is part of a collection
  delete rec.comment_count;
  delete rec.document_count;
  delete rec.video_count;
  delete rec.image_count;

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
    });
}

var markAsSeenWorked = (cb) => {
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
    });
}

var recommendManually = (cb) => {
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
    });
}

var recommendManuallyWorked = (cb) => {
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
    });
}

var bulkRecommendManually = (cb) => {
  return frisby.create('bulk recommend manually')
    .post('/recs', {
      mls_number: results.recommendation.markAsSeenWorked.data[0].listing.mls_number
    })
    .after(cb)
    .expectStatus(200)
    .expectJSON({
      code: 'OK'
    })
    .expectJSONTypes({
      code: String,
      data: Array,
      info: info_response
    });
}

module.exports = {
  feed,
  getFavorites,
  getTours,
  getActives,
  markAsFavorite,
  markAsFavoriteWorked,
  markAsTour,
  markAsTourWorked,
  seen,
  markAsSeen,
  markAsSeenWorked,
  recommendManually,
  recommendManuallyWorked,
  bulkRecommendManually
}
