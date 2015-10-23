global.frisby = require('frisby');

var config = require('../lib/config.js');
var async  = require('async');

var URL = 'http://localhost:'+config.http.port;

frisby.globalSetup({
  request: {
    json:true
  }
});

var auth_params = {
  client_id:'bf0da47e-7226-11e4-905b-0024d71b10fc',
  client_secret:'secret',
  username:'d@d.com',
  password:'foo',
  grant_type:'password',
}

var authorize = function(cb) {
  return frisby.create('get token')
    .post(URL+'/oauth2/token', auth_params)
    .expectStatus(200)
    .afterJSON(function(json) {
      frisby.globalSetup({
        timeout:10000,
        request: {
          json:true,
          baseUri:URL,
          headers: {
            Authorization: 'Bearer '+json.access_token
          }
        }
      });

    cb();
  });
}

function run(tasks) {
  authorize(() => {
    var runTask = function(task, key, cb) {
      task(cb).toss();
    }

    async.forEachOfSeries(tasks, runTask);

  }).toss();
}

module.exports = {
  auth:auth_params,
  frisby:frisby,
  run:run
}