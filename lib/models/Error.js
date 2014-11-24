Error.VALIDATION = {
  http:400,
  message:'Validation Error',
  code:'VALIDATION'
}

Error.DB = {
  http:503,
  message:'Database error',
  code:'INTERNAL'
}

Error.ACCESS = {
  http:403,
  message:'Access Denied',
  code:'ACCESS_DENIED'
}

Error.create = function(spec, details) {
  var e     = new Error;
  e.http    = spec.http;
  e.message = spec.message;
  e.details = details;
  return e;
}

Error.Validation = Error.create.bind(null, Error.VALIDATION);
Error.DB = Error.create.bind(null, Error.DB);
Error.Access = Error.create.bind(null, Error.ACCESS);

function attachMiddleware(app) {
  app.use(function(req, res, next) {
    res.error = function(err) {
      res.status(err.http);

      console.log(req.method, req.path, err);
      if(err.http >= 500)
        return res.json({message:'Internal Error'});

      res.json(err);
    }

    next();
  });
}

module.exports = attachMiddleware;