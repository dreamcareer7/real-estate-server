require('../connection.js');

var path = require('path');

require('../../lib/models/S3.js');

var readline = require('readline');
var fs = require('fs');

var rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

rl.question("enter name of the file for upload: ", function(file) {
  var ext = path.extname(file);

  fs.readFile(file, function(err, body) {
    if(err) {
      console.log(err);
      return;
    }

    console.time("S3-upload");
    S3.upload('shortlisted-test', {body: body, ext: ext}, function(err, upload) {
      if(err) {
        console.log(err);
        return;
      }

      console.timeEnd("S3-upload");
      console.log(upload);
    });
  });

  rl.close();
});

process.exit(0);
