var criteria = require('./data/alert_criteria.js');
var alert_response = require('./data/publicized/alert.js');
var info = require('./data/publicized/info.js');
var compact_listing = require('./data/publicized/compact_listing.js');


registerSuite('room', ['create']);
var maximum_price = 100000;

var create = (cb) => {
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
      data:[alert_response],
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
          }
        }
      ],
      info: {
        count: 1
      }
    })
    .expectJSONLength('data', 1)
    .expectJSONTypes({
      'data':[alert_response],
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
      'data':[compact_listing],
      info: info
    });
}

var bulkAlertShare = (cb) => {
  return frisby.create('bulk alert share')
    .post('/alerts', {alert: results.alert.create.data})
    .after(cb)
    .expectStatus(200)
    .expectJSON({
      code: 'OK'
    })
    .expectJSONTypes({
      code: String,
      data: Array,
      info: Object
    });
}

var deleteAlert = (cb) => {
  return frisby.create('delete alert')
    .delete('/rooms/' + results.alert.create.data.room + '/alerts/' + results.alert.create.data.id)
    .after(cb)
    .expectStatus(204)
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
  getUserAlerts,
  getRoomAlerts,
  patchAlert,
  patchAlertWorked,
  virtual,
  bulkAlertShare,
  deleteAlert,
  deleteAlertWorked
}