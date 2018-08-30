const {path: appRoot} = require('app-root-path')
// const stream = require('stream')
const fs = require('fs')
const path = require('path')
const rimraf = require('rimraf')

const Context = require('../Context')

const s3s = {}

function mkDirByPathSync(targetDir, { isRelativeToScript = false } = {}) {
  Context.log('mkDirByPathSync:', targetDir)

  const sep = path.sep
  const initDir = path.isAbsolute(targetDir) ? sep : ''
  const baseDir = isRelativeToScript ? __dirname : '.'

  return targetDir.split(sep).reduce((parentDir, childDir) => {
    const curDir = path.resolve(baseDir, parentDir, childDir)
    try {
      fs.mkdirSync(curDir)
    } catch (err) {
      if (err.code === 'EEXIST') { // curDir already exists!
        return curDir
      }

      // To avoid `EISDIR` error on Mac and `EACCES`-->`ENOENT` and `EPERM` on Windows.
      if (err.code === 'ENOENT') { // Throw the original parentDir error on curDir `ENOENT` failure.
        throw new Error(`EACCES: permission denied, mkdir '${parentDir}'`)
      }

      const caughtErr = ['EACCES', 'EPERM', 'EISDIR'].indexOf(err.code) > -1
      if (!caughtErr || caughtErr && targetDir === curDir) {
        throw err // Throw if it's just the last created dir.
      }
    }

    return curDir
  }, initDir)
}

s3s.upload = function({
  Bucket,
  Key
}) {
  Context.log(appRoot, Bucket, Key)
  const s3path = path.resolve(appRoot, '.s3storage', Bucket)
  const objPath = path.resolve(s3path, Key)

  const parts = objPath.split(path.sep)
  mkDirByPathSync(parts.slice(0, parts.length - 1).join(path.sep))

  const writable = fs.createWriteStream(objPath)

  writable.on('finish', () => {
    writable.emit('uploaded', {})
  })

  return writable
}

const s3 = {}

s3.getObject = ({Bucket, Key}, cb) => {
  const s3path = path.resolve(appRoot, '.s3storage', Bucket)
  const objPath = path.resolve(s3path, Key)

  if (!fs.existsSync(objPath)) {
    return cb(new Error('Object does not exist.'))
  }

  cb(null, {
    Body: fs.readFileSync(objPath)
  })
}

function downloader({params}) {
  const s3path = path.resolve(appRoot, '.s3storage', params.Bucket)
  const objPath = path.resolve(s3path, params.Key)

  if (!fs.existsSync(objPath)) {
    throw new Error('Object does not exist.')
  }
  
  return fs.createReadStream(objPath)
}

global.Run.on('suite done', () => {
  Context.log('Tests Done! Cleaning up...')

  const s3path = path.resolve(appRoot, '.s3storage')
  rimraf.sync(s3path)
})

module.exports = { s3s, s3, downloader }
