var message = require('./data/message.js');
registerSuite('room', ['create']);

var post = (cb) => {
  return frisby.create('post a message')
    .post('/rooms/' + results.room.create.data.id + '/messages', message)
    .after(cb)
    .expectStatus(200)
    .expectJSON({
      code: 'OK',
      data: {
        type: 'message',
        author: {
          id: results.room.create.data.owner.id
        }
      }
    });
}

var retrieve = (cb) => {
  return frisby.create('get messages')
    .get('/rooms/' + results.room.create.data.id + '/messages')
    .after(cb)
    .expectStatus(200)
    .expectJSON({
      code: 'OK',
      data: [results.message.post.data]
    })
    .expectJSONLength('data', 2);
}

module.exports = {
  post,
  retrieve,
};