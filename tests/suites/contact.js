registerSuite('user', ['create']);
registerSuite('tag', ['getAll']);

var first_name = 'updated_user_name';
var profile_image = 'updated_profile_image';
var cover_image = 'updated_cover_image';

var contact_response = require('./data/publicized/contact.js');
var info_response = require('./data/publicized/info.js');
var tag_response = require('./data/publicized/tag.js');


var create = (cb) => {
  return frisby.create('add a contact')
    .post('/contacts', {
      contacts: [
        {
          email: results.user.create.data.email,
          phone_number: results.user.create.data.phone_number,
          force_creation: true
        }
      ]
    })
    .after(cb)
    .expectStatus(200)
    .expectJSONLength('data', 1)
    .expectJSON({
      code: 'OK',
      data: [{
        email: results.user.create.data.email,
        phone_number: results.user.create.data.phone_number,
        type: "contact"
      }],
      info: {
        count: 1
      }
    })
    .expectJSONTypes({
      code: String,
      data: [contact_response],
      info: info_response
    });
};

var getContact = (cb) => {
  results.user.create.data.type = 'compact_user';

  return frisby.create('get list of contacts and see if the one we added is there')
    .get('/contacts')
    .after(cb)
    .expectStatus(200)
    .expectJSON({
      code: 'OK',
      data: [
        {contact_user: results.user.create.data}
      ],
      info: {}
    })
    .expectJSONTypes({
      code: String,
      data: [contact_response],
      info: info_response
    });
};

var updateContact = (cb) => {
  results.contact.create.data[0].contact_user.first_name = first_name;
  return frisby.create('update a contact')
    .put('/contacts/' + results.contact.create.data[0].id, results.contact.create.data[0].contact_user)
    .after(cb)
    .expectStatus(200)
    .expectJSON({
      code: 'OK',
      data: {
        email: results.user.create.data.email,
        phone_number: results.user.create.data.phone_number,
        type: "contact"
      }
    })
    .expectJSONTypes({
      code: String,
      data: contact_response,
      data: {
        tags: [tag_response]
      }
    });
};

var updateContactWorked = (cb) => {
  results.user.create.data.type = 'compact_user';

  return frisby.create('make sure update user was successful')
    .get('/contacts')
    .after(cb)
    .expectStatus(200)
    .expectJSON({
      code: 'OK',
      data: [
        {first_name: first_name}
      ]
    })
    .expectJSONTypes({
      code: String,
      data: [contact_response],
      info: info_response
    });
};

var patchContactProfileImage = (cb) => {
  return frisby.create('update profile image url for a contact')
    .patch('/contacts/' + results.contact.create.data[0].id + '/profile_image_url', {
      profile_image_url: profile_image
    })
    .after(cb)
    .expectStatus(200)
    .expectJSON({
      code: 'OK',
      data: {
        profile_image_url: profile_image
      }
    })
    .expectJSONTypes({
      code: String,
      data: contact_response,
      data: {
        tags: [tag_response]
      }
    });
};

var patchContactProfileImageWorked = (cb) => {
  return frisby.create('get list of contacts and see if updated image uri is there')
    .get('/contacts')
    .after(cb)
    .expectStatus(200)
    .expectJSON({
      code: 'OK',
      data: [
        {profile_image_url: profile_image}
      ]
    })
    .expectJSONTypes({
      code: String,
      data: [contact_response],
      info: info_response
    });
};

var patchContactCoverImage = (cb) => {
  return frisby.create('update cover image url for a contact')
    .patch('/contacts/' + results.contact.create.data[0].id + '/cover_image_url', {
      cover_image_url: cover_image
    })
    .after(cb)
    .expectStatus(200)
    .expectJSON({
      code: 'OK',
      data: {
        cover_image_url: cover_image
      }
    })
    .expectJSONTypes({
      code: String,
      data: contact_response,
      data: {
        tags: [tag_response]
      }
    });
};

var patchContactCoverImageWorked = (cb) => {
  return frisby.create('get list of contacts and see if updated cover uri is there')
    .get('/contacts')
    .after(cb)
    .expectStatus(200)
    .expectJSON({
      code: 'OK',
      data: [
        {cover_image_url: cover_image}
      ]
    })
    .expectJSONTypes({
      code: String,
      data: [contact_response],
      info: info_response
    });
};

var search = (cb) => {
  results.user.create.data.type = 'compact_user';

  return frisby.create('search contacts and see if the one we added is there')
    .get('/contacts/search?q=' + results.user.create.data.first_name)
    .after(cb)
    .expectStatus(200)
    .expectJSONLength('data', 1)
    .expectJSON({
      data: 'OK',
      data: [
        {contact_user: results.user.create.data}
      ],
      info: {
        count: 1
      }
    })
    .expectJSONTypes({
      code: String,
      data: [contact_response],
      info: info_response
    });
};

var addTag = (cb) => {
  return frisby.create('add tag to a contact')
    .post('/contacts/' + results.contact.create.data[0].id + '/tags', {
      tag_id: results.tag.getAll.data[0].id
    })
    .after(cb)
    .expectStatus(200)
    .expectJSON({
      code: 'OK'
    })
    .expectJSONTypes({
      code: String,
      data: contact_response,
      data: {
        tags: [tag_response]
      }
    });
}

var removeTag = (cb) => {
  return frisby.create('remove tag from a contact')
    .delete('/contacts/' + results.contact.create.data[0].id + '/tags/' + results.tag.getAll.data[0].id)
    .expectStatus(204)
    .after(cb);
}

var deleteContact = (cb) => {
  return frisby.create('delete a contact')
    .delete('/contacts/' + results.contact.create.data[0].id)
    .expectStatus(204)
    .after(cb);
};

var deleteContactWorked = (cb) => {
  var before_count = results.contact.getContact.info.count;

  return frisby.create('get list of contacts and make sure delete contact was successful')
    .get('/contacts')
    .after(cb)
    .expectStatus(200)
    .expectJSON({
      code: 'OK',
      info: {
        count: before_count - 1
      }
    });
};

module.exports = {
  create,
  addTag,
  getContact,
  updateContact,
  updateContactWorked,
  patchContactProfileImage,
  patchContactProfileImageWorked,
  patchContactCoverImage,
  patchContactCoverImageWorked,
  search,
  removeTag,
  deleteContact,
  deleteContactWorked
};
