const sample = {
  'Id': 'ApgoRyer1r6JcwR7gmQwcA==',
  'PropertyTypeId': 'A-f4kGLPgC3pDTESvRSVoQ==',
  'ClassificationId': '6X6yLtnzjon-VDy_CXNrGA==',
  'Status': 'Open',
  'CreatedTimestamp': '2017-11-22T21:57:10.0737288+00:00',
  'ModifiedTimestamp': '2017-11-22T21:57:10.0737288+00:00',
  'TransactionChangedTimestamp': '2017-11-22T21:57:10.1206176+00:00',
  'Number': 'TEMP367145',
  'MLSNumber': '13103256',
  'EntryDate': '2017-11-22',
  'CloseDate': '1980-01-01',
  'OfferDate': '1979-12-01',
  'SellPrice': 999999,
  'StatusCode': 'N',
  'LegalDescription': null,
  'RowVersion': 2169533,
  'MLSAddress': {
    'StreetNumber': '5020',
    'StreetName': 'Junius',
    'StreetDirection': '',
    'Unit': '3A',
    'City': 'Dallas',
    'ProvinceCode': 'TX',
    'Province': 'Texas',
    'PostalCode': '75214',
    'CountryCode': 'US',
    'Country': 'United States'
  },
  'PropertyType': {
    'Id': 'A-f4kGLPgC3pDTESvRSVoQ==',
    'Class': 'Commercial',
    'LWCompanyCode': '',
    'Code': 'CO',
    'Name': 'COMMERCIAL',
    'Default': false,
    'ClassCode': 'C',
    'InactiveDate': null
  },
  'Classification': {
    'Id': '6X6yLtnzjon-VDy_CXNrGA==',
    'LWCompanyCode': '',
    'Code': 'H',
    'Name': 'REFERRALS',
    'EndCount': 0,
    'InactiveDate': null
  },
  'BusinessContacts': [],
  'ClientContacts': [],
  'Conditions': [],
  'Tasks': null,
  'Tiers': [
    {
      'Id': 'PVj5-p9G2w6VpHTV7a7yZA==',
      'ClassificationId': '6X6yLtnzjon-VDy_CXNrGA==',
      'Status': 'Open',
      'CreatedTimestamp': '2017-11-22T21:57:10.0737288+00:00',
      'ModifiedTimestamp': '2017-11-22T21:57:10.0737288+00:00',
      'Name': null,
      'StatusCode': 'N',
      'SellPrice': 999999,
      'CloseDate': '1980-01-01',
      'SellingCommission': null,
      'BuyingCommission': null,
      'TotalCommission': null,
      'RowVersion': 2169534,
      'Classification': {
        'Id': '6X6yLtnzjon-VDy_CXNrGA==',
        'LWCompanyCode': '',
        'Code': 'H',
        'Name': 'REFERRALS',
        'EndCount': 0,
        'InactiveDate': null
      },
      'AgentCommissions': [
        {
          'Id': 'r321PxfP13Zrppy768Axqw==',
          'AgentId': 'SNVAemRCllFBcueYYILsiw==',
          'TeamLeaderId': '',
          'End': 'Listing',
          'CreatedTimestamp': '2017-11-22T21:57:10.0737288+00:00',
          'ModifiedTimestamp': '2017-11-22T21:57:10.0737288+00:00',
          'EndCode': 'L',
          'EndCount': 1,
          'CommissionPercentage': null,
          'Commission': null,
          'RowVersion': 2169535,
          'Agent': {
            'Id': 'SNVAemRCllFBcueYYILsiw==',
            'OfficeId': 'DOdPR3bdL6sIUNpveX9KMg==',
            'FirstName': 'Brett',
            'MiddleName': null,
            'LastName': 'Walker'
          },
          'TeamLeader': null
        }
      ],
      'ExternalAgentCommissions': []
    }
  ]
}

module.exports = JSON.stringify(sample)