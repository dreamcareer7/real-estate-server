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
  user_id:'74a1aa38-7100-11e4-905b-0024d71b10fc',
  subject_type:'listing',
  subject_id:'7cc88bc8-7100-11e4-905b-0024d71b10fc',
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