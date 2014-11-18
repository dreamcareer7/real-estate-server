var frisby = require('frisby');
var config = require('../lib/config.js');

var URL = 'http://localhost:'+config.http.port;

frisby.globalSetup({
  request: {
    json:true
  }
});

var agency = {
  type:'agency',
  name:'AB',
  phonenumber:'999999999',
  address:'Worst Neighborhood',
};

var agent = {
  username:'phubar',
  firstname:'foo',
  lastname:'bar',
  email:'foo.bar@provider.tld',
  phonenumber:'989124834198',
};

var createAgency = frisby.create('create agency')
  .post(URL+'/agency', agency)
  .expectStatus(201)
  .afterJSON(function(json) {
    agency.id = json.id;

    getAgency = frisby.create('get agency')
      .get(URL+'/agency/'+agency.id)
      .expectJSON(agency)
      .expectStatus(200);

    updatedAgency = JSON.parse(JSON.stringify(agency));
    updatedAgency.name = 'ABA';

    updateAgency = frisby.create('update agency')
      .put(URL+'/agency/'+agency.id, updatedAgency)
      .expectStatus(200);

    getUpdatedAgency = frisby.create('get updated agency')
      .get(URL+'/agency/'+agency.id)
      .expectJSON(updatedAgency)
      .expectStatus(200);

    deleteAgency = frisby.create('delete agency')
      .delete(URL+'/agency/'+agency.id)
      .expectStatus(204);

    createAgent = frisby.create('create agent')
      .post(URL+'/agency/'+agency.id+'/agents', agent)
      .expectStatus(201)
      .expectJSON(agent);
  });


describe("/agency", function() {
  it("creates, gets and deletes a agency", function() {
    createAgency.after(function() {
      getAgency.after(function() {
        updateAgency.after(function() {
          getUpdatedAgency.after(function() {
            createAgent.after(function() {
              deleteAgent.after(function() {
                deleteAgency.toss();
              }).toss();
            }).toss();
          }).toss();
        }).toss();
      }).toss();
    }).toss();
  });
});