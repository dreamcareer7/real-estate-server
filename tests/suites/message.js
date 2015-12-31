var uuid = require('node-uuid');
var message = require('./data/message.js');
var message_response = require('./expected_objects/message.js');
var info_response = require('./expected_objects/info.js');

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
    })
    .expectJSONTypes({
      code: String,
      data: message_response
    });
}

var post400 = (cb) => {
  return frisby.create('post a message')
    .post('/rooms/' + results.room.create.data.id + '/messages')
    .after(cb)
    .expectStatus(400);
}

var post404 = (cb) => {
  return frisby.create('post a message')
    .post('/rooms/' + uuid.v1() + '/messages')
    .after(cb)
    .expectStatus(404);
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
    .expectJSONLength('data', 2)
    .expectJSONTypes({
      code: String,
      data: [message_response],
      info: info_response
    });
}

var retrieve404 = (cb) => {
  return frisby.create('get messages')
    .get('/rooms/' + uuid.v1() + '/messages')
    .after(cb)
    .expectStatus(404);
}

module.exports = {
  post,
  post400,
  post404,
  retrieve,
  retrieve404
};