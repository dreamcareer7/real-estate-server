var ascurl = require('request-as-curl');

var enableResponse;

function logger(req, res, next) {
  var end = res.end;

  console.log( (req.headers['x-test-description']+': '+req.method+' '+req.path).yellow );
  res.end = function(data, encoding, callback) {
    console.log( (req.headers['x-test-description']+': '+req.method+' '+req.path).green );
    console.log(ascurl(req, req.body).cyan);

    if (enableResponse && data)
      console.log(data.toString().blue)
    end.call(res, data, encoding, callback);
  }

  next();
}

module.exports = ((program) => {
  enableResponse = !program.disableResponse;
  Run.on('app ready', (app) => app.use(logger));

  Run.on('message', (suite, message) => {
    if(message.code !== 'test done')
      return ;

    message.test.messages
    .filter( m => m !== 'Passed.' )
    .forEach( m=>console.log(m.red) );
  })

  if(!program.keep)
    Run.on('done', process.exit);
});