var config = require('../../lib/config.js');
registerSuite('contact', ['create']);


var getTransaction = (cb) => {
  return frisby.create('create new session')
    .get('/transactions/9ee52ce8-b15f-11e5-a2f9-14109fd0b9b3')
    .after(cb)
    .expectStatus(200);
}

var addRole = (cb) => {
  return frisby.create('create new session')
    .post('/transactions/9ee52ce8-b15f-11e5-a2f9-14109fd0b9b3/contacts/171e9c6b-1924-4fc6-971d-a8a84e3c3f11/roles',
    {
      roles: ['foo']
    })
    .after(cb)
    .expectStatus(200);
}

var removeRole = (cb) => {
  return frisby.create('create new session')
    .delete('/transactions/9ee52ce8-b15f-11e5-a2f9-14109fd0b9b3/contacts/171e9c6b-1924-4fc6-971d-a8a84e3c3f11/roles/foo')
    .after(cb)
    .expectStatus(204);
}

module.exports = {
  getTransaction,
  addRole,
  removeRole
}
