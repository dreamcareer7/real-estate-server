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
  message: 'Database Error',
  code: 'Internal'
}

Error.FILESYSTEM = {
  http: 500,
  message: 'Filesystem Error',
  code: 'Internal'
}

Error.AMAZON = {
  http: 500,
  message: 'Amazon Gateway Error',
  code: 'Internal'
}

Error.GENERIC = {
  http: 500,
  message: 'Generic Internal Error',
  code: 'Internal'
}

Error.UNAUTHORIZED = {
  http: 401,
  message: 'UnauthorizedAccess Error',
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

Error.BADREQUEST = {
  http: 400,
  message: 'Bad Request',
  code: 'BadRequest'
}

Error.create = function(spec, details) {
  if (spec != Error.RESOURCE_NOT_FOUND &&
      spec != Error.CONFLICT) {
    console.trace('Creating error', spec, details);
  }

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
Error.FileSystem = Error.create.bind(null, Error.FILESYSTEM);
Error.Amazon = Error.create.bind(null, Error.AMAZON);
Error.BadRequest = Error.create.bind(null, Error.BADREQUEST);
Error.Generic = Error.create.bind(null, Error.GENERIC);
