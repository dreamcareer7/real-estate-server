registerSuite('user', ['create']);

var add = (cb) => {
  return frisby.create('add a contact')
         .post('/contacts', {
            contacts:[
              {
                email: results.user.create.data.email,
                force_creation: true
              }
            ]
          })
         .expectStatus(200)
         .expectJSONLength('data', 1)
         .expectJSON({
           code:'OK',
           data:[]
         })
    .after(cb);
};

var get = (cb) => {
  results.user.create.data.type = 'compact_user';

  return frisby.create('get list of contacts and see if the one we added is there')
    .get('/contacts')
    .expectStatus(200)
    .expectJSONLength('data', 1)
    .expectJSON({
      data:'OK',
      data:[
        {contact_user: results.user.create.data}
      ]
    })
    .after(cb);
};

var search = (cb) => {
  results.user.create.data.type = 'compact_user';

  return frisby.create('search contacts and see if the one we added is there')
    .get('/contacts/search?q=' + results.user.create.data.first_name)
    .expectStatus(200)
    .expectJSONLength('data', 1)
    .expectJSON({
      data: 'OK',
      data:[
        {contact_user: results.user.create.data}
      ]
    })
    .after(cb);
};

var del = (cb) => {
  return frisby.create('delete a contact')
    .delete('/contacts/' + results.contact.add.data[0].id)
    .expectStatus(204)
    .after(cb);
};

module.exports = {
  add,
  get: get,
  search,
  delete: del
};
