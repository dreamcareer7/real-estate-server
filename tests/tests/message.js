var message = require('./data/message.js');
registerSpec('room', ['create']);

var post = (cb) => {
  return frisby.create('post a message')
        .post('/rooms/'+ results.room.create.data.id+'/messages', message)
        .expectStatus(200)
        .after(cb);
}

var retrieve = (cb) => {
  return frisby.create('get messages')
         .get('/rooms/' + results.room.create.data.id+'/messages')
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
  post,
  retrieve,
};