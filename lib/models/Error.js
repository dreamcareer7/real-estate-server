/**
 * @namespace Error
 */

/**
 * @typedef error
 * @type {object}
 * @memberof Error
 * @instance
 * @property {number} http - http response code
 * @property {string} message - error message
 * @property {string} code - internal error code
 */

Error.autoReport = true

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

Error.NOT_ACCEPTABLE = {
  http: 406,
  message: 'Not Acceptable',
  code: 'NotAcceptable'
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

Error.BRANCH = {
  http: 500,
  message: 'Branch Gateway Error',
  code: 'Internal'
}

Error.GENERIC = {
  http: 500,
  message: 'Internal Server Error',
  code: 'Internal'
}

Error.UNAUTHORIZED = {
  http: 401,
  message: 'Unauthorized Access Error',
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

Error.METHOD_NOT_ALLOWED = {
  http: 405,
  message: 'Method Not Allowed',
  code: 'MethodNotAllowed'
}

Error.PRECONDITION_FAILED = {
  http: 412,
  message: 'Precondition Failed',
  code: 'PreconditionFailed'
}

Error.NOT_IMPLEMENTED = {
  http: 501,
  message: 'Not Implemented',
  code: 'NotImplemented'
}

Error.create = function (spec, details) {
  // if (spec != Error.RESOURCE_NOT_FOUND &&
  if (Error.autoReport && spec != Error.CONFLICT) {
    console.log('Error:', spec, details)
  }

  const e = new Error()

  for (const i in spec)
    e[i] = spec[i]

  if (typeof details === 'object')
    for (const i in details)
      e[i] = details[i]

  if (typeof details === 'string')
    e.message = details

  return e
}

Error.Validation = Error.create.bind(null, Error.VALIDATION)
Error.Database = Error.create.bind(null, Error.DATABASE)
Error.Unauthorized = Error.create.bind(null, Error.UNAUTHORIZED)
Error.ResourceNotFound = Error.create.bind(null, Error.RESOURCE_NOT_FOUND)
Error.Forbidden = Error.create.bind(null, Error.FORBIDDEN)
Error.Conflict = Error.create.bind(null, Error.CONFLICT)
Error.FileSystem = Error.create.bind(null, Error.FILESYSTEM)
Error.Amazon = Error.create.bind(null, Error.AMAZON)
Error.Branch = Error.create.bind(null, Error.BRANCH)
Error.BadRequest = Error.create.bind(null, Error.BADREQUEST)
Error.Generic = Error.create.bind(null, Error.GENERIC)
Error.MethodNotAllowed = Error.create.bind(null, Error.METHOD_NOT_ALLOWED)
Error.PreconditionFailed = Error.create.bind(null, Error.PRECONDITION_FAILED)
Error.NotImplemented = Error.create.bind(null, Error.NOT_IMPLEMENTED)
Error.NotAcceptable = Error.create.bind(null, Error.NOT_ACCEPTABLE)
