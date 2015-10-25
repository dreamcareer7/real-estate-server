var message = require('./data/message.js');

var post = (cb) => {
  return frisby.create('post a message')
        .post('/rooms/'+ results.message.room.data.id+'/messages', message)
        .expectStatus(200)
        .after(cb);
}

var retrieve = (cb) => {
  return frisby.create('get messages')
         .get('/rooms/' + results.message.room.data.id+'/messages')
         .expectStatus(200)
         .expectJSON({
           code:'OK',
           data:[
           {}, //First message is "Blah joined"
           results.message.post.data
          ]
         })
         .after(cb);
}

module.exports = {
  room:require('./room.js').create,
  post,
  retrieve,
};