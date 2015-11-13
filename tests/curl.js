var ascurl = require('request-as-curl');

var enableResponse;

function logger(req, res, next) {
  console.log( ('--------- '+req.headers['x-suite']+': '+req.method+' '+req.path+' ---------').yellow );
  console.log(ascurl(req, req.body).green);


  var end = res.end;

  res.end = function(data, encoding, callback) {
    if (enableResponse && data)
      console.log(data.toString().red)
    end.call(res, data, encoding, callback);
  }

  next();
}

module.exports = ((e) => {
  enableResponse = e;
  Run.on('app ready', (app) => app.use(logger));
});