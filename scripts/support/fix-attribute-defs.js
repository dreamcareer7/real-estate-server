const fs = require('fs')

const pmapping = {
  '49b1127f-0cf6-46f0-86ec-08e039003e16': 'title',
  '6c40e986-3013-4c7d-86fb-1f68ffaaaeab': 'marketing_name',
  'ea245873-81b2-4746-88ef-4372d70bbf31': 'profile_image_url',
  '3e9b8292-63c7-43ea-8079-c04dc8b7ba6f': 'cover_image_url',
  'bbe8009f-8ba4-40d3-adcb-58993f06f6ec': 'source_type',
  'ca06ac76-9ce9-40f7-a69c-156ba77f3db7': 'source_id',
  'd3efd6f4-15cf-4f0f-8fae-aa3afaac101b': 'last_modified_on_source',
  'b1425269-1639-4193-9ce0-5cfbde3c0205': 'source',
  'eea884bb-729c-4eb4-ae83-b168fe9a6548': 'tag',
  'd82cd752-f638-40bd-9f0e-b8babeb250ca': 'note',
  'f95beaed-c437-45a3-9db3-384803a634df': 'company',
  'a01e1378-16d9-4f96-83e4-9ad069a1f4ad': 'job_title',
  '1423f1c2-1c5b-4958-8e46-0a0bf9aeb707': 'birthday',
  'ed40ee45-0446-4cd7-bfd6-8144e9bdcf02': 'postal_code',
  '12b34f41-2d1b-416f-86b2-fa289e41b581': 'street_number',
  'a5fa2a10-37fd-485f-90ab-aa4a510ddb48': 'street_prefix',
  'b9977bc0-16e3-40d2-a633-04df8449f4d1': 'street_suffix',
  '63c60d4b-1524-42cf-92e7-9842f145b4e3': 'unit_number',
  '7bc8d6d2-b5df-4f75-bbb2-a937ff62fea9': 'country',
  '49304e28-c1da-47a2-aef6-05fcbe564f15': 'street_name',
  '19b53a89-57cf-4210-998f-e23251d45bf1': 'city',
  '86c9c74b-7e23-49e3-9604-34cf84b29ef7': 'state',
  'da30665f-4834-4a83-95c0-135fe6abfd88': 'phone_number',
  'c74747aa-bfa6-4de9-9321-85c0b2dd0950': 'email',
  'a357dffe-bab1-49c4-9c8b-cff52aec2cea': 'website',
  'a2da546d-b430-4e3e-ae31-e9b599aeed11': 'first_name',
  '56a1c29c-f30e-4dcc-8247-0127636b42d0': 'middle_name',
  '7a54e209-98aa-427f-bb65-aaf2bc1c5b20': 'last_name',
  '66de248c-e981-4a28-855b-42eae9c65c59': 'nickname',
  '6b1259f9-53ea-4a3e-b8c9-0db2317032f5': 'important_date'
}

const bmapping = {
  profile_image_url: '493889eb-17c2-4e61-9a13-d177a0c043bd',
  cover_image_url: '205d1dee-f190-43bb-b391-cfdb74d71870',
  street_number: '3759623d-c5d5-461d-8e15-c0b6662d718a',
  street_prefix: '9b847350-436c-4da1-b9df-23eff829f365',
  street_suffix: 'dc02d7f1-0ac9-4ed1-9943-d6750f9af663',
  unit_number: '0c2d4e58-2954-4f1d-b408-d524900ea89c',
  country: 'cac8de39-5d29-4770-a3fb-ade6f6ecbf79',
  street_name: 'a71af5e7-a497-432a-ad7f-1143f44835db',
  city: 'dc7a8437-f97e-4459-aea2-a7dc597c7eea',
  tag: 'df5a82fb-b163-4193-880d-bb85bb14d5f2',
  note: 'f17a5812-7382-428a-93d4-142e2c128c91',
  title: 'd32dd3de-f099-497b-997b-64a49358e6af',
  state: '20f5af85-ed22-4bfb-ab15-d62d5978c377',
  marketing_name: 'c790428c-7564-41c9-92bd-7e5964696e54',
  postal_code: '08b9e815-5691-47f8-a038-9054ed46a7b4',
  first_name: 'a90a7cef-a080-44e3-8c13-eb33da4c0465',
  middle_name: '2a92ad44-5d9e-471c-b464-63c322193e49',
  last_name: '931bf654-a328-4eb5-90e5-52f925bbd9c3',
  nickname: 'f21c0d15-5a06-4c5f-a2a8-0fe9d36c5db7',
  company: '15517449-3790-4283-bccc-8a1ff0e4166d',
  job_title: '3bd05190-fa20-4a07-8c34-c244549cb0d7',
  birthday: '3b85122d-0f57-41b4-8580-dd52df836afb',
  important_date: '04c9e8da-527e-4d16-ad7e-5587953055aa',
  source_type: '991a1e54-cf87-4f32-b618-b2fb5004edae',
  source_id: '2a4c6e07-2a83-471e-9aff-4e1a2042a441',
  last_modified_on_source: '881c250f-6ea9-4464-a4af-91302b3dd60b',
  phone_number: '074c9902-23d9-4352-8b74-5a5531bd03f9',
  email: 'be7035e6-5854-4327-98ce-d4495b3be4c3',
  website: '641ff49f-fda4-4433-b4c7-f25ec69fb454',
  source: 'fe3cb892-10ed-4cfd-a198-a049eea41968'
}

const text = fs.readFileSync('/Users/abbas/contacts.json', 'utf-8')
const data = JSON.parse(text)
const contacts = data.contacts

for (const c of contacts) {
  for (const a of c.attributes) {
    a.attribute_def = bmapping[pmapping[a.attribute_def]]
  }
}

fs.writeFileSync(
  '/Users/abbas/contacts.boer.json',
  JSON.stringify(data),
  'utf-8'
)
