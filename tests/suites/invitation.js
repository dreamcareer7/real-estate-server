//register dependencies
registerSuite('room', ['create'])
registerSuite('user', ['create'])


var create = (cb) => {
    return frisby.create('create invitation')
        .post('/invitations/', {
            invitations: [{
                invited_user: results.user.create.data.id,
                inviting_user: results.user.create.data.id,
                email: results.user.create.data.email,
                phone_number: results.user.create.data.phone_number,
                invitee_name: results.user.create.data.first_name,
                room: results.room.create.data.id,
                url: ""
            }]
        })
        .after(cb)
        .expectHeaderContains('Content-Type', 'json')
        .expectStatus(200)
        .expectJSON({
            code: 'OK',
            data: [
                {
                    type: 'invitation'
                }
            ]
        })
        .expectJSONLength('data', 1);
}

module.exports = {
    create
}