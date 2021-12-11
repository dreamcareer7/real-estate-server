const SocketServer = require('../../socket')

const {
  OFFLINE
} = require('./constants')

const getStatus = function(user, _cb) {
  if (SocketServer.ready) {
    const status = SocketServer.getUserStatus(user)
    return _cb(null, status)
  }

  /*
   * We are trying to get online status of a user.
   * That is something SocketServer knows, which is only executed on HTTP Processes, because it opens up a port.
   * That means worker scripts and pollers and whatnot don't know if a user is online or not.
   * We used to have a mechanism for worker scripts to make an inquiry about a user's online status.
   * This was done using a job queue we had called Kue which made this easy.
   * But Kue was extremely unreliable and we removed it. But our replacement doesn't have such capability.
   * In the meantime, I cannot think of any use cases for non-http processes needing to know online state of a user.
   * So in those cases we just return offline.
   * I don't think that'd cause any real issues.
   */
  _cb(null, OFFLINE)
}

module.exports = {
  getStatus
}
