require('../../lib/models/S3.js');

var readline = require('readline');
var fs = require('fs');

var rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

rl.question("enter name of the file for upload: ", function(file) {
  fs.readFile(file, function(err, data) {
    if(err) {
      console.log(err);
      return;
    }

    console.time("S3-upload");
    S3.upload('shortlisted-test', data, function(err, res) {
      if(err) {
        console.log(err);
        return;
      }

      console.timeEnd("S3-upload");
      console.log(res);
    });
  });

  rl.close();
});