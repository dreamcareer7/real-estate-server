const spawn = require('child_process').exec
const mkdir = require('fs').mkdirSync

try {
  mkdir('/tmp/rechat')
} catch (e) {}

const c = spawn('node ' + __dirname + '/../tests/run --docs > /tmp/rechat/index.html', function (err, out) {
  console.log('Served on port', port)
})

c.stderr.pipe(process.stderr)

const express = require('express')
const app = express()

const port = process.env.PORT || 3080
require('http').Server(app)

app.use(express.static('/tmp/rechat'))
app.listen(port)
