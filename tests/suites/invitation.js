//register dependencies
registerSuite('room', ['create'])
registerSuite('user', ['create'])

var invitation_response = require('./expected_objects/invitation.js');
var info_response = require('./expected_objects/info.js');

var create = (cb) => {
  return frisby.create('create invitation')
    .post('/invitations/', {
      invitations: [{
        invited_user: results.user.create.data.id,
        inviting_user: results.authorize.token.data.id,
        email: results.user.create.data.email,
        phone_number: results.user.create.data.phone_number,
        invitee_first_name: results.user.create.data.first_name,
        invitee_last_name: results.user.create.data.last_name,
        room: results.room.create.data.id,
        url: ""
      }]
    })
    .after(cb)
    .expectStatus(200)
    .expectJSON({
      code: 'OK',
      data: [
        {
          type: 'invitation'
        }
      ]
    })
    .expectJSONLength('data', 1)
    .expectJSONTypes({
      code: String,
      data: [invitation_response],
      info: info_response
    });
}

module.exports = {
  create
}
