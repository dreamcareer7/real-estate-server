const { fork } = require('child_process')
const { once } = require('events')

const Context = require('../models/Context')

/**
 * @param {string} modulePath 
 * @param {object} args 
 * @param {import('child_process').ForkOptions=} options 
 */
async function forkWorker(modulePath, args, options) {
  /** @type {NodeJS.Timeout} */
  let shutdown_timer

  /** @type {NodeJS.Timeout} */
  let heartbeat_timer

  /** @type {import('child_process').ChildProcess} */
  let child

  let shutting_down = false

  function timeout(ms) {
    Context.log('timeout()')
    return new Promise((_, rej) => {
      shutdown_timer = setTimeout(rej, ms)
    })
  }

  function waitAndFork(ex) {
    Context.error(ex)

    if (shutting_down) return

    setTimeout(forkChild, 1000)
  }

  async function forkChild() {
    if (shutting_down) return
    if (child) child.removeAllListeners()

    child = fork(modulePath, [JSON.stringify(args)], options)
    child.once('error', waitAndFork)
    child.once('exit', waitAndFork)

    await once(child, 'message')
    monitorHeartbeat()
  }

  function kill() {
    Context.log('kill()')

    // should trigger an exit or an error event which creates a new fork
    child.kill('SIGKILL')
  }

  function resetHeartbeatTimer() {
    clearTimeout(heartbeat_timer)
    heartbeat_timer = setTimeout(kill, 60000)
  }

  function monitorHeartbeat() {
    resetHeartbeatTimer()
    child.on('message', resetHeartbeatTimer)
  }

  async function shutdown() {
    shutting_down = true
    child.kill('SIGTERM')

    child.removeAllListeners('exit')
    child.removeAllListeners('error')

    try {
      clearTimeout(heartbeat_timer)

      await Promise.race([
        timeout(30000),
        once(child, 'exit')
      ])
      clearTimeout(shutdown_timer)
    } catch {
      child.kill('SIGKILL')
    }
  }

  await forkChild()

  return shutdown
}

module.exports = {
  fork: forkWorker
}
