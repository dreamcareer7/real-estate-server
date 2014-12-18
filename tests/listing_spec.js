var setup = require('./setup.js');

var password = '520d41b29f891bbaccf31d9fcfa72e82ea20fcf0';

var listing = {
  id: '71026eea-7645-11e4-8fac-0024d71b10fc',
  first_name: 'foo',
  last_name: 'bar',
  email: 'foo.bar@provider.tld',
  phone_number: '989124834198',
  password: password
};

var client = JSON.parse(JSON.stringify(listing));
client.client_id = setup.auth.client_id;
client.client_secret = setup.auth.client_secret;

setup(function(err, frisby, URL) {
  var getListing = frisby.create('get listing')
                   .get(URL + '/listing/' + listing.id)
                   .expectJSON({
                     code: 'OK'
                   }).expectStatus(200);


  describe("/listing", function() {
    it("gets a listing", function() {
      getListing.toss();
    });
  });
});