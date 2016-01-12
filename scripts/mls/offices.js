#!/usr/bin/env node
var Client = require('./rets_client.js');
var colors = require('colors');
var slack = require('./slack.js');
var async = require('async');
var util = require('util');
var config = require('../../lib/config.js');
require('../../lib/models/index.js')();

Error.autoReport = false;

var program = require('./program.js');
var options = program.parse(process.argv);

options.resource = 'Office';
options.class = 'Office';

options.processor = processData;

Client.work(options, report);

function processData(cb, results) {
  async.forEach(results.mls, upsert, cb);
}

function map(mls_office) {
  return {
    board: mls_office.Board || null,
    email: mls_office.Email || null,
    fax: mls_office.FaxPhone || null,
    office_mui: mls_office.HeadOffice_MUI ? parseInt(mls_office.HeadOffice_MUI) : 0,
    office_mls_id: mls_office.HeadOfficeMLSID || null,
    licence_number: mls_office.LicenseNumber || null,
    address: mls_office.MailAddress || null,
    care_of: mls_office.MailCareOf || null,
    city: mls_office.MailCity || null,
    postal_code: mls_office.MailPostalCode || null,
    postal_code_plus4: mls_office.MailPostalCodePlus4 || null,
    state: mls_office.MailStateOrProvince || null,
    matrix_unique_id: parseInt(mls_office.Matrix_Unique_ID),
    matrix_modified_dt: mls_office.MatrixModifiedDT || null,
    mls: mls_office.MLS || null,
    mls_id: mls_office.MLSID || null,
    mls_provider: mls_office.MLSProvider || null,
    nar_number: mls_office.NARNumber || null,
    contact_mui: mls_office.OfficeContact_MUI || null,
    contact_mls_id: mls_office.OfficeContactMLSID || null,
    long_name: mls_office.OfficeLongName || null,
    name: mls_office.OfficeName || null,
    status: mls_office.OfficeStatus || null,
    phone: mls_office.Phone || null,
    other_phone: mls_office.OtherPhone || null,
    st_address: mls_office.StreetAddress || null,
    st_city: mls_office.StreetCity || null,
    st_country: mls_office.StreetCountry || null,
    st_postal_code: mls_office.StreetPostalCode || null,
    st_postal_code_plus4: mls_office.StreetPostalCodePlus4 || null,
    st_state: mls_office.StreetStateOrProvince || null,
    url: mls_office.WebPageAddress || null
  }
}

var upsert = function (office, cb) {
  Metric.increment('mls.processed_office');
  Office.getByMUI(office.Matrix_Unique_ID, function (err, id) {
    if (err && err.code !== 'ResourceNotFound')
      return cb(err);

    if (err && err.code === 'ResourceNotFound') {
      Metric.increment('mls.new_offices');

      Office.create(map(office), cb);
      return;
    }

    Metric.increment('mls.updated_offices');
    Office.update(id, map(office), cb);
  });
}

function report(err) {
  if(err)
    console.log(err);

  process.exit();
}