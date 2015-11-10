var _ = require('underscore');

registerSuite('alert', ['create']);

var feed = (cb) => {
  return frisby.create('get feed')
        .get('/rooms/' + results.room.create.data.id + '/recs/feed?filter='+results.alert.create.data.id)
        .after(cb)
        .expectStatus(200)
        .expectJSON({
          code: 'OK',
          data:[
            {
              type:'recommendation'
            }
          ]
        });
}

var favorites = (cb) => {
  return frisby.create('get favorites')
        .get('/rooms/' + results.room.create.data.id + '/recs/favorites')
        .after(cb)
        .expectStatus(200)
        .expectJSON({
          code: 'OK',
          data:[]
        })
        .expectJSONLength('data', 0);
}

var markAsFavorite = (cb) => {
  return frisby.create('favorite a rec')
        .patch('/rooms/' + results.room.create.data.id + '/recs/'+results.recommendation.feed.data[1].id+'/favorite', {
          favorite:true
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
          data:[results.recommendation.feed.data[1]]
        })
        .expectJSONLength('data', 1);
}

var seen = (cb) => {
  return frisby.create('get seen')
        .get('/rooms/' + results.room.create.data.id + '/recs/seen')
        .after(cb)
        .expectStatus(200)
        .expectJSON({
          code: 'OK',
          data:[]
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
        .delete('/rooms/' + results.room.create.data.id + '/recs/feed/'+results.recommendation.feed.data[1].id)
        .after(cb)
        .expectStatus(200)
        .expectJSON({
          code:'OK',
          data:rec
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
            count:1,
            total:1
          },
          data:[results.recommendation.feed.data[1]]
        })
        .expectJSONLength('data', 1);
}

module.exports = {
  feed,
  favorites,
  markAsFavorite,
  markAsFavoriteWorked,
  seen,
  markAsSeen,
  markAsSeenWorked
}
