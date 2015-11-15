var ascurl = require('request-as-curl');

var enableResponse;

function logger(req, res, next) {
  var end = res.end;

  res.end = function(data, encoding, callback) {
    console.log( ('--------- '+req.headers['x-suite']+': '+req.method+' '+req.path+' ---------').yellow );
    console.log(ascurl(req, req.body).green);

    if (enableResponse && data)
      console.log(data.toString().red)
    end.call(res, data, encoding, callback);
  }

  next();
}

module.exports = ((program) => {
  enableResponse = !program.disableResponse;
  Run.on('app ready', (app) => app.use(logger));

  if(!program.keep)
    Run.on('done', process.exit);
});