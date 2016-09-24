// register dependencies
registerSuite('room', ['create'])

const invitation_response = require('./expected_objects/invitation.js')
const info_response = require('./expected_objects/info.js')

const create = (cb) => {
  return frisby.create('create invitation')
    .post('/invitations/', {
      invitations: [{
        invited_user:       results.user.create.data.id,
        inviting_user:      results.authorize.token.data.id,
        email:              results.user.create.data.email,
        phone_number:       results.user.create.data.phone_number,
        invitee_first_name: results.user.create.data.first_name,
        invitee_last_name:  results.user.create.data.last_name,
        room:               results.room.create.data.id,
        url:                ''
      }]
    })
    .after(cb)
    .expectStatus(200)
    .expectJSON({
      code: 'OK',
      data: [
        {
          type:          'invitation',
          invited_user:  results.user.create.data,
          inviting_user: results.authorize.token.data
        }
      ]
    })
    .expectJSONLength('data', 1)
    .expectJSONTypes({
      code: String,
      data: [invitation_response],
      info: info_response
    })
}

const create400 = (cb) => {
  return frisby.create('expect 400 with empty model')
    .post('/invitations/')
    .after(cb)
    .expectStatus(400)
}

module.exports = {
  create,
  create400
}

