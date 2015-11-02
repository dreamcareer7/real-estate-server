var ascurl = require('request-as-curl');

function logger(req, res, next) {
  console.log( ('--------- '+req.headers['x-suite']+': '+req.method+' '+req.path+' ---------').yellow );
  console.log(ascurl(req).green);
  console.log();
  next();
}

Run.on('app ready', (app) => app.use(logger));