var message = require('./data/message.js');
registerSuite('room', ['create']);

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
           data:[]
         })
         .expectJSON('data.?', results.message.post.data)
         .expectJSONLength('data', 2)
         .after(cb);
}

module.exports = {
  post,
  retrieve,
};