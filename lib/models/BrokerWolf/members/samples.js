const samples = [
  {
    'Id': 'SNVAemRCllFBcueYYILsiw==',
    'MemberTypeId': 'i2qvo45Ne5XkHLIQFRAASg==',
    'OfficeId': 'DOdPR3bdL6sIUNpveX9KMg==',
    'CreatedTimestamp': '2017-04-25T15:04:19.1800000+00:00',
    'ModifiedTimestamp': '2017-04-25T15:04:19.7470000+00:00',
    'MemberChangedTimestamp': '2017-04-25T15:04:19.7470000+00:00',
    'FirstName': 'Brett',
    'MiddleName': '',
    'LastName': 'Walker',
    'Number': '2443',
    'Title': 'Agent',
    'Suffix': '',
    'Nickname': '',
    'GenderCode': null,
    'LegalName': null,
    'Username': null,
    'LoadingDocsUsername': null,
    'InactiveDate': null,
    'StartDate': '2017-04-05',
    'Office': {
      'Id': 'DOdPR3bdL6sIUNpveX9KMg==',
      'Name': 'Partner - Rechat',
      'LWCompanyCode': 'LWRC02'
    },
    'MemberType': {
      'Id': 'i2qvo45Ne5XkHLIQFRAASg==',
      'Name': 'Agent',
      'Code': '0092013'
    },
    'Addresses': null,
    'EmailAddresses': null,
    'MLSBoards': [
      {
        /*
         * Must match the sample agent MLS code. Rest of data here is pretty useless and just an example.
         * If this doesn't match, the example agent in the system wont connect to BW and tests will fail
         */
        'MLSId': '0092013',
        'MLSAreaId': 'ReChat'
      }
    ],
    'PhoneNumbers': null,
    'PublicProfiles': null,
    'Tags': null,
    'Websites': null,
    'Integrations': null,
    'MovingWolfEnabled': null
  }
]

module.exports = JSON.stringify(samples)