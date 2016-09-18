var criteria = require('./data/alert_criteria.js');
var alert_response = require('./expected_objects/alert.js');
var info = require('./expected_objects/info.js');
var compact_listing = require('./expected_objects/compact_listing.js');
var uuid = require('node-uuid');

registerSuite('room', ['create']);
var maximum_price = 100000;

var create = (cb) => {
  criteria.created_by = results.room.create.data.owner;
  criteria.room = results.room.create.data.id;
  return frisby.create('create alert')
    .post('/rooms/' + results.room.create.data.id + '/alerts', criteria)
    .after(cb)
    .expectStatus(200)
    .expectJSON({
      code: 'OK',
      data: criteria
    })
    .expectJSONTypes('data', alert_response);
}

var create400 = (cb) => {
  return frisby.create('expect 400 with empty model when creating an alert')
    .post('/rooms/' + results.room.create.data.id + '/alerts')
    .after(cb)
    .expectStatus(400);
}

var getUserAlerts = (cb) => {
  return frisby.create('get user alerts and make sure create alert was successful')
    .get('/alerts')
    .after(cb)
    .expectStatus(200)
    .expectJSON({
      code: 'OK'
    }).expectJSON({
      code: 'OK',
      data: [
        {
          id: results.alert.create.data.id,
          created_by: {
            type: "user",
            id: results.room.create.data.owner.id
          }
        }
      ]
    })
    .expectJSONTypes({
      data: [alert_response],
      info: info
    });
}

var getRoomAlerts = (cb) => {
  return frisby.create('get room alerts and make sure create alert was successful')
    .get('/rooms/' + results.alert.create.data.room + '/alerts')
    .after(cb)
    .expectStatus(200)
    .expectJSON({
      code: 'OK',
      data: [
        {
          id: results.alert.create.data.id,
          created_by: {
            type: "user",
            id: results.room.create.data.owner.id
          },
          room: results.room.create.data.id
        }
      ],
      info: {
        count: 1
      }
    })
    .expectJSONLength('data', 1)
    .expectJSONTypes({
      'data': [alert_response],
      info: info
    });
}

var patchAlert = (cb) => {
  return frisby.create('patch alert')
    .put('/rooms/' + results.alert.create.data.room + '/alerts/' + results.alert.create.data.id, {
      maximum_price: maximum_price
    })
    .after(cb)
    .expectStatus(200)
    .expectJSON({
      code: 'OK'
    })
    .expectJSONTypes('data', alert_response)
}

var patchAlert404 = (cb) => {
  return frisby.create('expect 404 with invalid alert id when updating an alert')
    .put('/rooms/' + results.alert.create.data.room + '/alerts/' + uuid.v1(), {
      maximum_price: maximum_price
    })
    .after(cb)
    .expectStatus(404);
}

var patchAlertWorked = (cb) => {
  return frisby.create('make sure patch alert was successful')
    .get('/rooms/' + results.alert.create.data.room + '/alerts')
    .after(cb)
    .expectStatus(200)
    .expectJSON({
      code: 'OK',
      data: [
        {
          maximum_price: maximum_price
        }
      ],
      info: {
        count: 1
      }
    })
    .expectJSONTypes('data', [alert_response])
    .expectJSONLength('data', 1);
}

var virtual = (cb) => {
  var criteria = require('./data/valert_criteria.js')
  return frisby.create('virtual alert')
    .post('/valerts', criteria)
    .after(cb)
    .expectStatus(200)
    .expectJSON({
      code: 'OK',
      data: [
        {
          type: 'compact_listing'
        }
      ]
    })
    .expectJSONTypes({
      'data': [compact_listing],
      info: info
    });
}

var virtual400 = (cb) => {
  var criteria = require('./data/valert_criteria.js')
  return frisby.create('expect 400 with empty model when creating a valert')
    .post('/valerts')
    .after(cb)
    .expectStatus(400);
}

var deleteAlert = (cb) => {
  return frisby.create('delete alert')
    .delete('/rooms/' + results.alert.create.data.room + '/alerts/' + results.alert.create.data.id)
    .after(cb)
    .expectStatus(204)
}

var deleteAlert404 = (cb) => {
  return frisby.create('expect 404 with invalid alert id when deleting an alert')
    .delete('/rooms/' + results.alert.create.data.room + '/alerts/' + uuid.v1())
    .after(cb)
    .expectStatus(404)
}

var deleteAlertWorked = (cb) => {
  return frisby.create('make sure delete alert was successful')
    .get('/rooms/' + results.alert.create.data.room + '/alerts')
    .after(cb)
    .expectStatus(200)
    .expectJSON({
      code: 'OK',
      info: {
        count: 0
      }
    })
    .expectJSONLength('data', 0);
}

module.exports = {
  create,
  create400,
  getUserAlerts,
  getRoomAlerts,
  patchAlert,
  patchAlert404,
  patchAlertWorked,
  virtual,
  virtual400,
  deleteAlert404,
  deleteAlert,
  deleteAlertWorked
}