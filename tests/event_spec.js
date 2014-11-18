var frisby = require('frisby');
var config = require('../lib/config.js');

var URL = 'http://localhost:'+config.http.port;

frisby.globalSetup({
  request: {
    json:true
  }
});

var event = {
  action:'view',
  user_id:1,
  subject_type:'listing',
  subject_id:2,
  timestamp:((new Date).getTime())
};


var createEvent = frisby.create('create event')
  .post(URL+'/event', event)
  .expectStatus(201);


describe("/event", function() {
  it("creates an event", function() {
    createEvent.toss();
  });
});