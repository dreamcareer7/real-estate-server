var _ = require('underscore');

registerSuite('alert', ['create']);

var feed = (cb) => {
  return frisby.create('get feed')
    .get('/rooms/' + results.room.create.data.id + '/recs/feed?filter=' + results.alert.create.data.id)
    .after(cb)
    .expectStatus(200)
    .expectJSON({
      code: 'OK',
      data: [
        {
          type: 'recommendation'
        }
      ]
    });
}

var getFavorites = (cb) => {
  return frisby.create('get favorites')
    .get('/rooms/' + results.room.create.data.id + '/recs/favorites')
    .after(cb)
    .expectStatus(200)
    .expectJSON({
      code: 'OK',
      data: []
    })
    .expectJSONLength('data', 0);
}

var getTours = (cb) => {
  return frisby.create('get tours')
    .get('/rooms/' + results.room.create.data.id + '/recs/tours')
    .after(cb)
    .expectStatus(200)
    .expectJSON({
      code: 'OK',
      data: []
    })
    .expectJSONLength('data', 0);
}

var getActives = (cb) => {
  return frisby.create('get actives')
    .get('/rooms/' + results.room.create.data.id + '/recs/actives')
    .after(cb)
    .expectStatus(200)
    .expectJSON({
      code: 'OK',
      data: []
    })
    .expectJSONLength('data', 0);
}

var markAsFavorite = (cb) => {
  return frisby.create('favorite a rec')
    .patch('/rooms/' + results.room.create.data.id + '/recs/' + results.recommendation.feed.data[1].id + '/favorite', {
      favorite: true
    })
    .after(cb)
    .expectStatus(200)
}

var markAsFavoriteWorked = (cb) => {
  return frisby.create('make sure favorite was successful')
    .get('/rooms/' + results.room.create.data.id + '/recs/favorites')
    .after(cb)
    .expectStatus(200)
    .expectJSON({
      code: 'OK',
      data: [results.recommendation.feed.data[1]]
    })
    .expectJSONLength('data', 1);
}

var markAsTour = (cb) => {
  return frisby.create('tour a rec')
    .patch('/rooms/' + results.room.create.data.id + '/recs/' + results.recommendation.feed.data[1].id + '/tour', {
      favorite: true
    })
    .after(cb)
    .expectStatus(200)
    .expectJSON({
      code: 'OK',
      data: {
        type: 'recommendation'
      }
    });
}

var seen = (cb) => {
  return frisby.create('get seen')
    .get('/rooms/' + results.room.create.data.id + '/recs/seen')
    .after(cb)
    .expectStatus(200)
    .expectJSON({
      code: 'OK',
      data: []
    })
    .expectJSONLength('data', 0);
}

var markAsSeen = (cb) => {
  var rec = _.clone(results.recommendation.feed.data[1]);

  //These are only present when recommendation is part of a collection
  delete rec.comment_count;
  delete rec.document_count;
  delete rec.video_count;
  delete rec.image_count;

  return frisby.create('mark a rec as seen')
    .delete('/rooms/' + results.room.create.data.id + '/recs/feed/' + results.recommendation.feed.data[1].id)
    .after(cb)
    .expectStatus(200)
    .expectJSON({
      code: 'OK',
      data: rec
    })
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
      data: [results.recommendation.feed.data[1]]
    })
    .expectJSONLength('data', 1);
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
      code: 'OK',
      data: []
    });
}

var getRecommendation = (cb) => {
  return frisby.create('get a recommendation')
    .get('/rooms/' + results.room.create.data.id + '/recs/' + results.recommendation.feed.data[1].id)
    .after(cb)
    .expectStatus(200)
    .expectJSON({
      code: 'OK',
      data: {
        type: 'recommendation'
      }
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
  seen,
  markAsSeen,
  markAsSeenWorked,
  recommendManually,
  bulkRecommendManually,
  getRecommendation
}
