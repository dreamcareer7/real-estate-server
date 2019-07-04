class PeanarInternalError extends Error {}
class PeanarAdapterError extends Error {}
class PeanarJobError extends Error {}

module.exports = {
  PeanarAdapterError,
  PeanarInternalError,
  PeanarJobError,
}
