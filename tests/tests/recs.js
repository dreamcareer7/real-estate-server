registerSpec('alert', ['create']);

var feed = (cb) => {
  return frisby.create('get feed')
        .get('/rooms/' + results.room.create.data.id + '/recs/feed')
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
        .patch('/rooms/' + results.room.create.data.id + '/recs/'+results.recs.feed.data[1].id+'/favorite', {
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
          data:[results.recs.feed.data[1]]
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
  return frisby.create('mark a rec as seen')
        .delete('/rooms/' + results.room.create.data.id + '/recs/feed/'+results.recs.feed.data[1].id)
        .after(cb)
        .expectStatus(200)
        .expectJSON({
          code:'OK',
          data:results.recs.feed.data[1]
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
          data:[results.recs.feed.data[1]]
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