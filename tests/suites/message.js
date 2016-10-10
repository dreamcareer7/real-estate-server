const uuid = require('node-uuid')
const message = require('./data/message.js')
const message_response = require('./expected_objects/message.js')
const info_response = require('./expected_objects/info.js')

registerSuite('recommendation', ['feed'])

const post = (cb) => {
  message.recommendation = results.recommendation.feed.data[0].id
  message.author = results.room.create.data.owner.id
  message.room = results.room.create.data.id
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
    })
}

const post400 = (cb) => {
  return frisby.create('expect 400 with empty model')
    .post('/rooms/' + results.room.create.data.id + '/messages')
    .after(cb)
    .expectStatus(400)
}

const post404 = (cb) => {
  return frisby.create('expect 404 with invalid room id')
    .post('/rooms/' + uuid.v1() + '/messages')
    .after(cb)
    .expectStatus(404)
}

const retrieve = (cb) => {
  return frisby.create('get messages')
    .get('/rooms/' + results.room.create.data.id + '/messages')
    .after(cb)
    .expectStatus(200)
    .expectJSON({
      code: 'OK',
      data: [results.message.post.data]
    })
    .expectJSONTypes({
      code: String,
      data: [message_response],
      info: info_response
    })
}

const retrieve404 = (cb) => {
  return frisby.create('expect 404 with invalid room id')
    .get('/rooms/' + uuid.v1() + '/messages')
    .after(cb)
    .expectStatus(404)
}

module.exports = {
  post,
  post400,
  post404,
  retrieve,
  retrieve404
}
