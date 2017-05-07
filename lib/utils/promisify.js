// const originalThen = Promise.prototype.then
//
// Promise.prototype.then = function (cb, eb) {
//   eb = e => {
//     console.log(typeof process.domain)
//     console.log(e)
//     throw (e)
//   }
//
//   return originalThen.call(this, cb, eb)
// }

const promisify = fn => {
  return (...args) => {
    return new Promise((resolve, reject) => {
      const d = process.domain
      const callback = (err, results) => {
        if (d)
          d.enter()

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

  const resolve = res => {
    callback(null, res)
  }

  const reject = err => {
    callback(err)
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