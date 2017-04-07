'use strict'

const async = require('async')
const db = require('../lib/utils/db')
const config = require('../lib/config')
const Domain = require('domain')

require('../lib/models/index.js')()

const sql_query = `SELECT
                   forms_data.*,
                   (
                     SELECT deal FROM forms_submissions WHERE id = forms_data.submission
                   ) as deal
                   FROM forms_data FULL JOIN files_relations ON forms_data.id = files_relations.role_id
                   WHERE files_relations.id IS NULL`

const migrate = next => {
  const connection = cb => {
    db.conn((err, conn) => {
      if (err)
        return cb(err)

      const domain = Domain.create()
      domain.db = conn
      domain.enter()
      cb(null, conn)
    })
  }

  const revisions = (cb, results) => {
    results.db.query(sql_query, (err, res) => {
      if (err)
        return cb(err)

      cb(null, res.rows)
    })
  }

  const save = (cb, results) => {
    async.mapLimit(results.revisions, 3, saveSubmissionPdf, cb)
  }

  async.auto({
    db: connection,
    revisions: ['db', revisions],
    save: ['revisions', save]
  }, next)
}

const saveSubmissionPdf = (revision, cb) => {
  const save = (cb, results) => {
    const url = {
      url: `${config.forms.url}/generate.pdf`,
      method: 'POST',
      json: true,
      body: {
        token: results.token.token,
        values: revision.values,
        form: results.form
      }
    }

    AttachedFile.saveFromUrl({
      path: revision.deal,
      filename: results.form.name + '.pdf',
      url,
      user: results.user,
      relations: [
        {
          role: 'SubmissionRevision',
          id: revision.id
        }
      ]
    }, cb)
  }

  const getForm = cb => Form.get(revision.form, cb)

  const getUser = cb => User.get(revision.author, cb)

  const getToken = cb => Token.create({
    client_id: '4caf30bc-1b6d-11e7-93ae-92361f002671',
    user_id: revision.author,
    type: 'access'
  }, cb)

  const done = (err, results) => {
    if (err)
      return cb(err)

    cb(err, results)
  }

  async.auto({
    form: getForm,
    user: getUser,
    token: getToken,
    pdf: ['form', 'user', 'token', save]
  }, done)
}

exports.up = migrate
exports.down = cb => cb()
