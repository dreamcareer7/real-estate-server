registerSuite('user', ['create']);
registerSuite('listing', ['by_mui']);

var uuid             = require('node-uuid');
var contact_response = require('./expected_objects/contact.js');
var info_response    = require('./expected_objects/info.js');
var contact          = require('./data/contact.js');
var _                = require('underscore');

var first_name       = 'updated_user_name';
var profile_image    = 'updated_profile_image';
var cover_image      = 'updated_cover_image';

var create = (cb) => {
  contact.contact_user = results.user.create.data;
  contact.address = results.listing.by_mui.data.address;
  contact.first_name = results.user.create.data.first_name;
  contact.last_name = results.user.create.data.last_name;
  contact.phone_number = results.user.create.data.phone_number;
  contact.email = results.user.create.data.email;
  return frisby.create('add a contact')
    .post('/contacts', {
      contacts: [contact]
    })
    .after(cb)
    .expectStatus(200)
    .expectJSONLength('data', 1)
    .expectJSON({
      code: 'OK',
      data: [{
        email: results.user.create.data.email,
        phone_number: results.user.create.data.phone_number,
        type: 'contact'
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

var create400 = (cb) => {
  return frisby.create('expect 400 with empty model when creating a contact')
    .post('/contacts')
    .after(cb)
    .expectStatus(400);
};

var addTag = (cb) => {
  return frisby.create('add tag to a contact')
    .post('/contacts/' + results.contact.create.data[0].id + '/tags', {
      tags: ['foo', 'bar']
    })
    .after(cb)
    .expectStatus(200)
    .expectJSON({
      code: 'OK'
    })
    .expectJSONTypes({
      code: String,
      data: contact_response
    });
};

var addTag400 = (cb) => {
  return frisby.create('expect 400 with empty model when adding a tag')
    .post('/contacts/' + results.contact.create.data[0].id + '/tags')
    .after(cb)
    .expectStatus(400);
};

var addTag404 = (cb) => {
  return frisby.create('expect 404 with invalid contact id when adding a tag to a contact')
    .post('/contacts/' + uuid.v1() + '/tags', {
      tags: ['foo', 'bar']
    })
    .after(cb)
    .expectStatus(404);
};

var getContact = (cb) => {
  results.user.create.data.type = 'compact_user';

  return frisby.create('get list of contacts and see if the one we added is there')
    .get('/contacts')
    .after(cb)
    .expectStatus(200)
    .afterJSON( json => {
      var must = ['New', 'bar', 'foo'];
      var is = json.data[0].tags;
      if(_.difference(must, is) != [])
        throw new Error('Tags dont match: Its ['+is+'] But should be ['+must+']');
    })
    .expectJSON({
      code: 'OK',
      data: [
        {
          contact_user: results.user.create.data
        }
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
  results.contact.create.data[0].contact_user.tags = ['newTag'];
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
      data: contact_response
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

var updateContact404 = (cb) => {
  return frisby.create('expect 404 with invalid contact id when updating a contact')
    .put('/contacts/' + uuid.v1(), results.contact.create.data[0].contact_user)
    .after(cb)
    .expectStatus(404);
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
      data: contact_response
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

var patchContactProfileImage404 = (cb) => {
  return frisby.create('expect 404 with invalid contact id when updating a profile image')
    .patch('/contacts/' + uuid.v1() + '/profile_image_url', {
      profile_image_url: profile_image
    })
    .after(cb)
    .expectStatus(404);
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
      data: contact_response
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

var patchContactCoverImage404 = (cb) => {
  return frisby.create('expect 404 with invalid contact id when updating a cover image')
    .patch('/contacts/' + uuid.v1() + '/cover_image_url', {
      cover_image_url: cover_image
    })
    .after(cb)
    .expectStatus(404);
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

var getByTag = (cb) => {
  return frisby.create('filter contacts by tags')
    .get('/contacts?tags=foo,bar')
    .after(cb)
    .expectStatus(200)
    .expectJSON({
      code: 'OK'
    });
};

var removeTag = (cb) => {
  return frisby.create('remove tag from a contact')
    .delete('/contacts/' + results.contact.create.data[0].id + '/tags/test')
    .expectStatus(204)
    .after(cb);
};

var removeTag404 = (cb) => {
  return frisby.create('expect 404 with invalid id when removing a tag')
    .delete('/contacts/' + uuid.v1() + '/tags/test')
    .expectStatus(204)
    .after(cb);
};

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
  create400,
  addTag,
  addTag400,
  addTag404,
  getContact,
  getByTag,
  updateContact,
  updateContactWorked,
  updateContact404,
  patchContactProfileImage,
  patchContactProfileImageWorked,
  patchContactProfileImage404,
  patchContactCoverImage,
  patchContactCoverImageWorked,
  patchContactCoverImage404,
  search,
  removeTag,
  deleteContact,
  deleteContactWorked
};
