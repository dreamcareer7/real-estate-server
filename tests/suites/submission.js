const {fields, submission} = require('./data/submission.js')
const responses = require('./expected_objects/submission.js')

registerSuite('form', ['create'])
registerSuite('deal', ['create'])

let deal
let form

const create = cb => {
  form = results.form.create.data
  deal = results.deal.create.data

  submission.values[fields.full_address] = deal.proposed_values.full_address

  submission.form = form.id

  return frisby.create('submit a form')
    .post(`/deals/${deal.id}/submissions`, submission)
    .after(cb)
    .expectStatus(200)
    .expectJSON({
      code: 'OK',
    })
    .expectJSONTypes({
      code: String,
      data: responses.submission
    })
}

const getAll = cb => {
  // url is a signed url and changes on every request. Don't check on it.

  delete results.submission.create.data.url

  return frisby.create('get all submission for a deal')
    .get(`/deals/${deal.id}/submissions`)
    .after(cb)
    .expectStatus(200)
    .expectJSON({
      code: 'OK',
      data: [results.submission.create.data]
    })
    .expectJSONTypes({
      code: String,
      data: [responses.submission]
    })
}

const update = cb => {
  submission.values[fields.date] = (new Date()).toString()

  return frisby.create('update a submission')
    .put(`/forms/submissions/${results.submission.create.data.id}`, submission)
    .after(cb)
    .expectStatus(200)
    .expectJSON({
      code: 'OK',
      data: {
        revision_count: 2
      }
    })
}

const getRevision = cb => {
  return frisby.create('get a revision')
    .get(`/forms/submissions/revisions/${results.submission.update.data.last_revision}`)
    .after(cb)
    .expectStatus(200)
    .expectJSON({
      code: 'OK',
      data: {
        values: submission.values
      }
    })
}

const remove = cb => {
  return frisby.create('delete a submission')
    .delete(`/forms/submissions/${results.submission.create.data.id}`)
    .after(cb)
    .expectStatus(204)
}

module.exports = {
  create,
  getAll,
  update,
  getRevision,
  remove,
}
