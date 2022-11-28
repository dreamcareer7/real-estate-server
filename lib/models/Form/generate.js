const Submission = require('./submission/upsert')
const Office = require('../Office/get')

const request = require('request-promise-native')
const pdfjs = require('pdfjs-dist/legacy/build/pdf.js')
const groupAnnotations = require('../Deal/form/group-annotations')
const getValues = require('../Deal/form/get-values')
const getPdfUrl = require('../Deal/form/get-pdf-url')
const setDynamicRoles = require('../Deal/form/set-dynamic-roles')

const generate = async ({form, brand, agent, user}) => {
  const office = agent.office_id ? await Office.get(agent.office_id) : {}

  // deal, roles
  const deal = {
    deal_type: 'Selling'
  }

  const roles = [
    {
      role: 'SellerAgent',
      legal_full_name: agent.full_name,
      agent: {
        ...agent,
        office
      },
    }
  ]
  const definitions = []

  const pdf = await getPdfUrl({
    form: form.id
  })

  const data = await request({
    url: pdf,
    encoding: null
  })

  setDynamicRoles({deal, roles})

  const document = await pdfjs.getDocument({data}).promise

  let values = {}

  for(let i = 1; i <= document.numPages; i++) {
    const page = await document.getPage(i)
    const annotations = await page.getAnnotations()

    const groups = groupAnnotations(annotations)
    const pageValues = getValues({groups, deal, roles, definitions})

    values = {
      ...values,
      ...pageValues
    }
  }

  return Submission.create({
    form_id: form.id,
    user_id: user.id,
    state: 'Draft',
    values,
    path: `${user.id}/forms/${form.id}`,
    pdf
  })
}

module.exports = { generate }
