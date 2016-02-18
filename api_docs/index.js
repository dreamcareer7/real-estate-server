var spawn = require('child_process').exec;
var mkdir = require('fs').mkdirSync;

try {
  mkdir('/tmp/rechat');
} catch(e) {}

spawn('node '+__dirname+'/../tests/run --docs > /tmp/rechat/index.html', function(err, out) {
  if(err)
    console.log(err);
  
  console.log('Served on port', port);
});

var express = require('express');
var app = express();

var port = process.env.PORT || 3080;
var http = require('http').Server(app);

app.use(express.static('/tmp/rechat'));
app.listen(port);
