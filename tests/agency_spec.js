var agency = {
  type:'agency',
  name:'AB',
  phone_number:'999999999',
  address:'Worst Neighborhood',
};

var agent = {
  username:'agentsmith',
  first_name:'foo',
  last_name:'bar',
  email:'foo.bar@provider.tld',
  phone_number:'989124834198',
  password:'520d41b29f891bbaccf31d9fcfa72e82ea20fcf0'
};

require('./setup.js')(function(err, frisby, URL) {
  var createAgency = frisby.create('create agency')
    .post(URL+'/agencies', agency)
    .expectStatus(201)
    .afterJSON(function(json) {
      agency.id = json.data.id;

      getAgency = frisby.create('get agency')
        .get(URL+'/agency/'+agency.id)
        .expectJSON({
          code:'OK',
          data:agency
        })
        .expectStatus(200);

      updatedAgency = JSON.parse(JSON.stringify(agency));
      updatedAgency.name = 'ABA';

      updateAgency = frisby.create('update agency')
        .put(URL+'/agency/'+agency.id, updatedAgency)
        .expectStatus(200);

      getUpdatedAgency = frisby.create('get updated agency')
        .get(URL+'/agency/'+agency.id)
        .expectJSON({
          data:'OK',
          data:updatedAgency
        })
        .expectStatus(200);

      deleteAgency = frisby.create('delete agency')
        .delete(URL+'/agency/'+agency.id)
        .expectStatus(204);

      createAgent = frisby.create('create agent')
        .post(URL+'/agency/'+agency.id+'/agents', agent)
        .expectStatus(201)
        .afterJSON(function(ajson) {
          agent.id = ajson.data.id;
          delete agent.password;

          getAgents = frisby.create('list agents')
            .get(URL+'/agency/'+agency.id+'/agents')
            .expectStatus(200)
            .expectJSON({
              code:'OK',
              data:[agent]
            });

          deleteAgent = frisby.create('delete agent')
            .delete(URL+'/user/'+agent.id)
            .expectStatus(204);
        })
    });


  describe("/agency", function() {
    it("creates, gets and deletes a agency", function() {
      createAgency.after(function() {
        getAgency.after(function() {
          updateAgency.after(function() {
            getUpdatedAgency.after(function() {
              createAgent.after(function() {
                getAgents.after(function() {
                  deleteAgent.after(function() {
                    deleteAgency.toss();
                  }).toss();
                }).toss();
              }).toss();
            }).toss();
          }).toss();
        }).toss();
      }).toss();
    });
  });
});