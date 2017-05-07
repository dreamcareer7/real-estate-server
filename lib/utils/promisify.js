const originalThen = Promise.prototype.then

Promise.prototype.then = function (cb, eb) {
  eb = e => {
    throw (e)
  }

  return originalThen.call(this, cb, eb)
}

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

module.exports = promisify