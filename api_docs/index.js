var spawn = require('child_process').spawnSync;

var generator = spawn('node', [
                      __dirname+'/../tests/run',
                      '--docs'
                ]);

var output = generator.stdout.toString().trim();

var express = require('express');
var app = express();

var port = process.env.HTTP_PORT || 3080;
var http = require('http').Server(app);

app.get('/', (req,res) => res.end(output));

app.listen(port);

var url = 'http://localhost:'+port;
console.log('Your browser is now opened. Documentation is stored at', port);
spawn('xdg-open', [url]);
