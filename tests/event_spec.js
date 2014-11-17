var frisby = require('frisby');
var config = require('../lib/config.js');

var URL = 'http://localhost:'+config.http.port;

var event = {
  action:'view',
  user_id:1,
  subject_type:'listing',
  subject_id:2,
  timestamp:((new Date).getTime())/1000
};


var createEvent = frisby.create('create event')
  .post(URL+'/event', event)
  .expectStatus(201);


describe("/event", function() {
  it("creates an event", function() {
    createEvent.toss();
  });
});