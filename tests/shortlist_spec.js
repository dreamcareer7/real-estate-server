var setup = require('./setup.js');

var password = '520d41b29f891bbaccf31d9fcfa72e82ea20fcf0';

var shortlist = {
    shortlist_type: 'Shoppers',
    title: 'foobar',
    owner: '3aaa6a98-741d-11e4-a1b5-0024d71b10fc'
};

var client = JSON.parse(JSON.stringify(shortlist));
client.client_id = setup.auth.client_id;
client.client_secret = setup.auth.client_secret;

setup(function(err, frisby, URL) {
  var createShortlist = frisby.create('create shortlist')
    .post(URL + '/shortlists', client)
    .expectStatus(201)
    .afterJSON(function(json) {
      shortlist.id = json.data.id;

      getShortlist = frisby.create('get shortlist')
        .get(URL + '/shortlist/' + shortlist.id)
        .expectJSON({
          code: 'OK',
          data: shortlist,
        })
        .expectStatus(200);

      deleteShortlist = frisby.create('delete shortlist')
        .delete(URL + '/shortlist/' + shortlist.id)
        .expectStatus(204);
    });


  describe("/shortlist", function() {
    it("creates, gets and deletes a shortlist", function() {
      createShortlist.after(function() {
        getShortlist.after(function() {
          deleteShortlist.toss();
        }).toss();
      }).toss();
    });
  });
});