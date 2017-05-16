const promisify = fn => {
  return (...args) => {
    return new Promise((resolve, reject) => {
      const callback = (err, results) => {
        if (err)
          return reject(err)

        resolve(results)
      }

      args.push(callback)

      fn.apply(this, args)
    })
  }
}

const nodeify = promise => {
  let callback

  /* process.nextTick's are very important.
   * What happens is that the error/response coming from a promise
   * is not actually bound to a domain. Therefore, our efforts in
   * bubbling it up will actually fail.
   *
   * By bounding it to next tick, node will consider this rejection
   * as a handled one. Also the error will be bound to the domain.
  */


  const resolve = res => {
    process.nextTick(() => {
      callback(null, res)
    })
  }

  const reject = err => {
    process.nextTick(() => {
      callback(err)
    })
  }

  promise
  .then(resolve)
  .catch(reject)

  return cb => {
    callback = cb
  }
}

Promise.prototype.nodeify = function(cb) {
  return nodeify(this)(cb)
}

module.exports = promisify