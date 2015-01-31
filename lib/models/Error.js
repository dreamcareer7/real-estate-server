Error.RESOURCE_NOT_FOUND = {
  http: 404,
  message: 'Resource Error',
  code: 'ResourceNotFound'
}

Error.VALIDATION = {
  http: 400,
  message: 'Validation Error',
  code: 'Validation'
}

Error.DATABASE = {
  http: 503,
  message: 'Database error',
  code: 'Internal'
}

Error.UNAUTHORIZED = {
  http: 401,
  message: 'Unauthorized Access',
  code: 'UnauthorizedAccess'
}

Error.FORBIDDEN = {
  http: 403,
  message: 'Access Forbidden',
  code: 'AccessForbidden'
}

Error.CONFLICT = {
  http: 409,
  message: 'Resource Already Exists',
  code: 'Conflict'
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
Error.Database = Error.create.bind(null, Error.DATABASE);
Error.Unauthorized = Error.create.bind(null, Error.UNAUTHORIZED);
Error.ResourceNotFound = Error.create.bind(null, Error.RESOURCE_NOT_FOUND);
Error.Forbidden = Error.create.bind(null, Error.FORBIDDEN);
Error.Conflict = Error.create.bind(null, Error.CONFLICT);
