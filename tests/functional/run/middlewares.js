const path = require('path')
const fs = require('fs')

const sortBy = require('lodash/sortBy')
const { formatPhoneNumberForDialing } = require('../../../lib/models/ObjectUtil.js')

const TEMP_PATH = path.resolve(__dirname, '../../temp')

const { rollback } = require('./db')

function installTestMiddlewares(app) {
  return (cb) => {
    app.post('_/rollback', (req, res) => {
      rollback(req.query.suite)
      res.end()
    })

    app.get('_/dummy', (req, res) => {
      res.end()
    })

    app.post('/_/brands', (req, res) => {
      const async = require('async')
      const BrandHelper = require('../../unit/brand/helper')

      async.mapSeries(
        req.body,
        (brand, cb) => BrandHelper.create(brand).nodeify(cb),
        function (err, response) {
          if (err) {
            throw err
          }

          res.collection(response)
        }
      )
    })

    app.get('/sms/inbox/:number', (req, res) => {
      const suite = req.header('x-suite')
      const number = formatPhoneNumberForDialing(req.params.number)

      if (!suite) {
        res.status(500)
        return res.end()
      }
      const dir = path.resolve(TEMP_PATH, 'sms', suite, number)

      try {
        const files = fs.readdirSync(dir)
        const messages = files.map((f) => {
          return {
            ...JSON.parse(fs.readFileSync(path.resolve(dir, f), { encoding: 'utf-8' })),
            timestamp: parseInt(f.replace(/\.json$/, '')),
          }
        })
        for (const f of files) {
          fs.unlinkSync(path.resolve(dir, f))
        }
        res.json({
          data: sortBy(messages, 'timestamp'),
        })
      } catch {
        res.status(404)
      }

      res.end()
    })

    cb()
  }
}

module.exports = installTestMiddlewares