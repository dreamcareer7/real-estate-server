Error.RESOURCE_NOT_FOUND = {
  http: 404,
  message: 'Resource Error',
  code: 'RESOURCE_NOT_FOUND'
}

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
  console.log('Creating error', spec);

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