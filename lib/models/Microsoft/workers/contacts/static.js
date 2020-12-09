const targetKeys = [
  'givenName', 'surname', 'middleName', 'nickName', 'title', 'spouseName', 'categories',
  'photo', 'parentFolderId', 'birthday', 'personalNotes',
  'jobTitle', 'companyName', 'businessHomePage',
  'mobilePhone', 'homePhones', 'businessPhones',
  'emailAddresses', 'homeAddress', 'businessAddress', 'otherAddress'
]

const projection = [
  'id', 'createdDateTime', 'lastModifiedDateTime', 'changeKey', 'parentFolderId',
  'displayName', 'givenName', 'middleName', 'nickName', 'surname', 'title', 'spouseName', 'categories',
  'jobTitle', 'companyName',
  'businessHomePage', 'birthday', 'personalNotes',
  'homePhones', 'mobilePhone', 'businessPhones',
  'emailAddresses', 'homeAddress', 'businessAddress', 'otherAddress',
]

const fiveXErr = [500, 501, 502, 503, 504]

const ECONNRESET = 'Error: read ECONNRESET'

module.exports = {
  targetKeys,
  projection,
  fiveXErr,
  ECONNRESET
}