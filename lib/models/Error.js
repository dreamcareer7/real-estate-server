Error.RESOURCE_NOT_FOUND = {
  http: 404,
  message: 'Resource Error',
  code: 'ResourceNotFound'
}

Error.VALIDATION = {
  http:400,
  message:'Validation Error',
  code:'Validation'
}

Error.DB = {
  http:503,
  message:'Database error',
  code:'Internal'
}

Error.ACCESS = {
  http:403,
  message:'Access Denied',
  code:'AccessDenied'
}

Error.create = function(spec, details) {
  console.trace('Creating error', spec, details);

  var e = new Error;

  for(var i in spec)
    e[i] = spec[i];

  if(typeof details === 'object')
    for(var i in details)
      e[i] = details[i];

  if(typeof details === 'string')
    e.message = details;

  return e;
}

Error.Validation = Error.create.bind(null, Error.VALIDATION);
Error.DB = Error.create.bind(null, Error.DB);
Error.Access = Error.create.bind(null, Error.ACCESS);
Error.ResourceNotFound = Error.create.bind(null, Error.RESOURCE_NOT_FOUND);