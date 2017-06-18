const uuid = require('node-uuid')
const message = require('./data/message.js')
const message_response = require('./expected_objects/message.js')
const info_response = require('./expected_objects/info.js')
const config = require('../../lib/config')
const sms = require('./message/sms.js')

require('../../lib/models/Crypto')

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

const post404 = (cb) => {
  return frisby.create('expect 404 with invalid room id')
    .post('/rooms/' + uuid.v1() + '/messages')
    .after(cb)
    .expectStatus(404)
}

const retrieve = (cb) => {
  delete results.message.post.data.deliveries
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

const emailReply = cb => {
  const address = Crypto.encrypt(JSON.stringify({
    room_id: results.room.create.data.id,
    user_id: results.authorize.token.data.id
  })) + '@' + config.email.seamless_address

  const u = 'https://upload.wikimedia.org/wikipedia/en/4/48/Blank.JPG'

  const body = {
    domain: config.mailgun.domain,
    'stripped-text': 'Foobar',
    recipient: address,
    attachments: `[
      {"url": "${u}", "content-type": "image/jpeg", "name": "5f2a92cb-a31e-4ce8-8218-3dd6f43cf7b0.jpg", "size": 92758},
      {"url": "${u}", "content-type": "image/png", "name": "profile-pic.png", "size": 260809}
    ]`
  }

  return frisby.create('receive a reply from mailgun')
    .post('/messages/email', body)
    .after(cb)
    .expectStatus(200)
}

const smsReply = cb => {
  sms.From = '+18598161689'

  return frisby.create('receive a reply from twilio')
    .post('/messages/sms', sms, {json: false})
    .after(cb)
    .expectStatus(200)
}

const seamlessEmail = cb => {
  return frisby.create('send seamless email')
    .post('/jobs', {name:'Seamless.Email'})
    .after(cb)
    .expectStatus(200)
}

module.exports = {
  post,
  post404,
  retrieve,
  retrieve404,
  emailReply,
  smsReply,
  seamlessEmail
}
