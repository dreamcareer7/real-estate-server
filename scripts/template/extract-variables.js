#!/usr/bin/env node

require('../connection.js')
const Template = require('../../lib/models/Template/get')
const AttachedFile = require('../../lib/models/AttachedFile')
const extractVariables = require('../../lib/models/Template/extract-variables')
const promisify = require('../../lib/utils/promisify')

const extract = async () => {
  const template = await Template.get(process.argv[2])

  const html = (await promisify(AttachedFile.download)(template.file)).toString()
  const variables = extractVariables(html)

  console.log(variables)
}

extract()
  .catch(e => {
    console.log(e)
    process.exit()
  })
