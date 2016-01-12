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
options.job = 'offices';

options.processor = processData;

Client.work(options, report);

function processData(cb, results) {
  async.forEach(results.mls, upsert, cb);
}

function map(mls_office) {
  return {
    board: mls_office.Board,
    email: mls_office.Email,
    fax: mls_office.FaxPhone,
    office_mui: mls_office.HeadOffice_MUI ? parseInt(mls_office.HeadOffice_MUI) : 0,
    office_mls_id: mls_office.HeadOfficeMLSID,
    licence_number: mls_office.LicenseNumber,
    address: mls_office.MailAddress,
    care_of: mls_office.MailCareOf,
    city: mls_office.MailCity,
    postal_code: mls_office.MailPostalCode,
    postal_code_plus4: mls_office.MailPostalCodePlus4,
    state: mls_office.MailStateOrProvince,
    matrix_unique_id: parseInt(mls_office.Matrix_Unique_ID),
    matrix_modified_dt: mls_office.MatrixModifiedDT,
    mls: mls_office.MLS,
    mls_id: mls_office.MLSID,
    mls_provider: mls_office.MLSProvider,
    nar_number: mls_office.NARNumber,
    contact_mui: mls_office.OfficeContact_MUI,
    contact_mls_id: mls_office.OfficeContactMLSID,
    long_name: mls_office.OfficeLongName,
    name: mls_office.OfficeName,
    status: mls_office.OfficeStatus,
    phone: mls_office.Phone,
    other_phone: mls_office.OtherPhone,
    st_address: mls_office.StreetAddress,
    st_city: mls_office.StreetCity,
    st_country: mls_office.StreetCountry,
    st_postal_code: mls_office.StreetPostalCode,
    st_postal_code_plus4: mls_office.StreetPostalCodePlus4,
    st_state: mls_office.StreetStateOrProvince,
    url: mls_office.WebPageAddress
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