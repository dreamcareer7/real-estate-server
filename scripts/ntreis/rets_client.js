#!/usr/bin/env node

require('../connection.js');

var async = require('async');
var db = require('../../lib/utils/db.js');
var error = require('../../lib/models/Error.js');
var config = require('../../lib/config.js');
var fs = require('fs');
var sleep = require('sleep');
var _u = require('underscore');
var program = require('commander');
var colors = require('colors');
var request = require('request');

var updatedAddresses = 0;
var updatedProperties = 0;
var updatedListings = 0;
var createdAddresses = 0;
var createdProperties = 0;
var createdListings = 0;
var geocodedAddresses = 0;
var s3ResourcesCreated = 0;
var totalItems = 0;
var itemsStart = '';
var itemsEnd = '';

var payload = {
  channel: '#ntreis-updates',
  username: config.slack.this,
  icon_emoji: ':house:'
}

var headers = {
  'User-Agent': 'Super Agent/0.0.1',
  'Content-Type': 'application/x-www-form-urlencoded'
}

var options = {
  url: config.slack.webhook,
  method: 'POST',
  headers: headers,
  form: {
  }
}

program.version(config.ntreis.version)
.option('-e, --enable-recs', 'Enable recommending listings to matching alerts')
.option('-p, --enable-photo-fetch', 'Disable fetching photos of properties')
.option('-r, --enable-cf-links', 'Disable displaying of CloudFront links')
.option('-l, --limit', 'Limit RETS server response manually (default: 100)', parseInt)
.option('-i, --initial', 'Performing initial fetch process')
.parse(process.argv);

require('../../lib/models/Address.js');
require('../../lib/models/Property.js');
require('../../lib/models/Listing.js');
require('../../lib/models/Shortlist.js');
require('../../lib/models/User.js');
require('../../lib/models/MessageRoom.js');
require('../../lib/models/Recommendation.js');
require('../../lib/models/S3.js');
require('../../lib/models/Notification.js');
require('../../lib/models/SES.js');
require('../../lib/models/Crypto.js');
require('../../lib/models/Email.js');
require('../../lib/models/Invitation.js');

var retsLoginUrl = config.ntreis.login_url;
var retsUser = config.ntreis.user;
var retsPassword = config.ntreis.password;

var client = require('rets-client').getClient(retsLoginUrl, retsUser, retsPassword);
var timing = JSON.parse(fs.readFileSync('./timing.config.js', 'utf8'));

Date.prototype.toNTREISString = function() {
  return this.toISOString().replace('Z', '+');
}

function init() {
  if (!program.limit) program.limit = config.ntreis.default_limit;
  notice();
}

function notice() {
  console.log('NTREIS connector'.cyan, config.ntreis.version.cyan);
  console.log('Runtime arguments:');
  console.log('Instant Recommendation:'.yellow, (program.enableRecs) ? 'yes'.green : 'no'.red);
  console.log('Photo Fetching:'.yellow, (program.enablePhotoFetch) ? 'yes'.green : 'no'.red);
  console.log('Show CloudFront Links:'.yellow, (program.enableCfLinks) ? 'yes'.green : 'no'.red);
  console.log('Initial Fetch:'.yellow, (program.initial) ? 'yes'.green : 'no'.red);
  console.log('Manual RETS Response Limit:'.yellow, program.limit);
}

function applyTimeDelta(dt) {
  var dt_ = new Date(dt);
  var lapsed = new Date(dt_.getTime() + 100);

  return lapsed.toNTREISString();
}

function byMatrixModifiedDT(a, b) {
  var a_ = new Date(a.MatrixModifiedDT);
  var b_ = new Date(b.MatrixModifiedDT);

  if(a_ > b_)
    return 1;
  else if(b_ > a_)
    return -1;
  else
    return 0;
}

function byMatrix_Unique_ID(a, b) {
  var a_ = a.Matrix_Unique_ID;
  var b_ = b.Matrix_Unique_ID;

  if(a_ > b_)
    return 1;
  else if(b_ > a_)
    return -1;
  else
    return 0;
}

function createObjects(data, cb) {
  var address = {};
  var property = {};
  var listing = {};

  address.title = '';
  address.subtitle = '';
  address.street_name = data.StreetName.trim();
  address.city = data.City.trim();
  address.state = 'Texas';
  address.state_code = data.StateOrProvince.trim();
  address.postal_code = data.PostalCode.trim();
  address.neighborhood = '';
  address.street_suffix = data.StreetSuffix.trim();
  address.street_number = data.StreetNumber.trim();
  address.unit_number = data.UnitNumber.trim();
  address.country = 'United States';
  address.country_code = 'USA';
  address.matrix_unique_id = parseInt(data.Matrix_Unique_ID) || 0;
  address.county_or_parish = data.CountyOrParish.trim();
  address.directions = data.Directions.trim();
  address.street_dir_prefix = data.StreetDirPrefix.trim();
  address.street_dir_suffix = data.StreetDirSuffix.trim();
  address.street_number_searchable = data.StreetNumberSearchable.trim();

  property.bedroom_count = parseInt(data.BedsTotal) || 0;
  property.bathroom_count = parseFloat(data.BathsTotal) || 0.0;
  property.half_bathroom_count = parseFloat(data.BathsHalf) || 0.0;
  property.full_bathroom_count = parseFloat(data.BathsFull) || 0.0;
  property.description = data.PublicRemarks.trim();
  property.square_meters = (parseFloat(data.SqFtTotal) || 0.0 ) / 10.764;
  property.lot_square_meters = (parseFloat(data.LotSizeAreaSQFT) || 0.0) / 10.764;
  property.property_type = data.PropertyType.trim();
  property.property_subtype = data.PropertySubType.trim();
  property.matrix_unique_id = parseInt(data.Matrix_Unique_ID) || 0;
  property.year_build = parseInt(data.YearBuilt) || 0;
  property.parking_spaces_covered_total = parseFloat(data.ParkingSpacesCoveredTotal) || 0.0;
  property.heating = '{' + data.Heating + '}';
  property.flooring = '{' + data.Flooring + '}';
  property.utilities = '{' + data.Utilities + '}';
  property.utilities_other = '{' + data.UtilitiesOther + '}';
  property.architectural_style = data.ArchitecturalStyle.trim();
  property.structural_style = data.StructuralStyle.trim();
  property.number_of_stories = parseInt(data.NumberOfStories) || 0;
  property.number_of_stories_in_building = parseInt(data.NumberOfStoriesInBuilding) || 0;
  property.number_of_parking_spaces = parseFloat(data.NumberOfParkingSpaces) || 0.0;
  property.parking_spaces_carport = parseFloat(data.ParkingSpacesCarport) || 0.0;
  property.parking_spaces_garage = parseFloat(data.ParkingSpacesGarage) || 0.0;
  property.garage_length = parseFloat(data.GarageLength) || 0.0;
  property.garage_width = parseFloat(data.GarageWidth) || 0.0;
  property.number_of_dining_areas = parseInt(data.NumberOfDiningAreas) || 0;
  property.number_of_living_areas = parseInt(data.NumberOfLivingAreas) || 0;
  property.fireplaces_total = parseInt(data.FireplacesTotal) || 0;
  property.lot_number = data.LotNumber.trim();
  property.soil_type = data.SoilType.trim();
  property.construction_materials = data.ConstructionMaterials.trim();
  property.construction_materials_walls = data.ConstructionMaterialsWalls.trim();
  property.foundation_details = data.FoundationDetails.trim();
  property.roof = data.Roof.trim();
  property.pool_yn = Boolean(parseInt(data.PoolYN));
  property.handicap_yn = Boolean(parseInt(data.HandicapYN));
  property.elementary_school_name = data.ElementarySchoolName.trim();
  property.intermediate_school_name = data.IntermediateSchoolName.trim();
  property.high_school_name = data.HighSchoolName.trim();
  property.junior_high_school_name = data.JuniorHighSchoolName.trim();
  property.middle_school_name = data.MiddleSchoolName.trim();
  property.primary_school_name = data.PrimarySchoolName.trim();
  property.senior_high_school_name = data.SeniorHighSchoolName.trim();
  property.school_district = data.SchoolDistrict.trim();
  property.subdivision_name = data.SubdivisionName.trim();
  // Property Features
  property.accessibility_features = '{' + data.AccessibilityFeatures + '}';
  property.bedroom_bathroom_features = '{' + data.BedroomBathroomFeatures + '}';
  property.commercial_features = '{' + data.CommercialFeatures + '}';
  property.community_features = '{' + data.CommunityFeatures + '}';
  property.energysaving_features = '{' + data.EnergySavingFeatures + '}';
  property.exterior_features = '{' + data.ExteriorFeatures + '}';
  property.interior_features = '{' + data.InteriorFeatures + '}';
  property.farmranch_features = '{' + data.FarmRanchFeatures + '}';
  property.fireplace_features = '{' + data.FireplaceFeatures + '}';
  property.lot_features = '{' + data.LotFeatures + '}';
  property.parking_features = '{' + data.ParkingFeatures + '}';
  property.pool_features = '{' + data.PoolFeatures + '}';
  property.security_features = '{' + data.SecurityFeatures + '}';

  property.appliances_yn = Boolean(parseInt(data.AppliancesYN.trim()));
  property.building_number = data.BuildingNumber.trim();
  property.ceiling_height = parseFloat(data.CeilingHeight.trim()) || 0.0;
  property.green_building_certification = data.GreenBuildingCertification.trim();
  property.green_energy_efficient = data.GreenEnergyEfficient.trim();
  property.lot_size = parseFloat(data.LotSize.trim()) || 0.0;
  property.lot_size_area = parseFloat(data.LotSizeArea.trim()) || 0.0;
  property.lot_size_dimensions = data.LotSizeDimensions.trim();
  property.map_coordinates = data.MapCoordinates.trim();
  property.number_of_pets_allowed = parseInt(data.NumberOfPetsAllowed.trim()) || 0;
  property.number_of_units = parseInt(data.NumberOfUnits.trim()) || 0;
  property.pets_yn = Boolean(parseInt(data.PetsYN.trim()));
  property.photo_count = parseInt(data.PhotoCount.trim()) || 0;
  property.room_count = parseInt(data.RoomCount.trim()) || 0;
  property.subdivided_yn = Boolean(parseInt(data.SubdividedYN.trim()));
  property.surface_rights = data.SurfaceRights.trim();
  property.unit_count = parseInt(data.UnitCount.trim()) || 0;
  property.year_built_details = data.YearBuiltDetails.trim();
  property.zoning = data.Zoning.trim();
  property.security_system_yn = Boolean(parseInt(data.SecuritySystemYN.trim()));

  listing.currency = 'USD';
  listing.price = parseFloat(data.ListPrice) || 0.0;
  listing.status = data.Status.trim();
  listing.matrix_unique_id = parseInt(data.Matrix_Unique_ID) || 0;
  listing.last_price = parseFloat(data.LastListPrice) || 0.0;
  listing.low_price = parseFloat(data.ListPriceLow) || 0.0;
  listing.original_price = parseFloat(data.OriginalListPrice) || 0.0;
  listing.association_fee = parseFloat(data.AssociationFee) || 0.0;
  listing.association_fee_frequency = data.AssociationFeeFrequency;
  listing.association_fee_includes = data.AssociationFeeIncludes;
  listing.association_type = data.AssociationType.trim();
  listing.mls_number = data.MLSNumber.trim();
  listing.unexempt_taxes = parseFloat(data.UnexemptTaxes) || 0.0;
  listing.financing_proposed = data.FinancingProposed.trim();
  listing.list_office_mui = parseInt(data.ListOffice_MUI) || 0;
  listing.list_office_mls_id = data.ListOfficeMLSID.trim();
  listing.list_office_name = data.ListOfficeName.trim();
  listing.list_office_phone = data.ListOfficePhone.trim();
  listing.co_list_office_mui = parseInt(data.CoListOffice_MUI) || 0;
  listing.co_list_office_mls_id = data.CoListOfficeMLSID.trim();
  listing.co_list_office_name = data.CoListOfficeName.trim();
  listing.co_list_office_phone = data.CoListOfficePhone.trim();
  listing.selling_office_mui = parseInt(data.SellingOffice_MUI) || 0;
  listing.selling_office_mls_id = data.SellingOfficeMLSID.trim();
  listing.selling_office_name = data.SellingOfficeName.trim();
  listing.selling_office_phone = data.SellingOfficePhone.trim();
  listing.co_selling_office_mui = parseInt(data.CoSellingOffice_MUI) || 0;
  listing.co_selling_office_mls_id = data.CoSellingOfficeMLSID.trim();
  listing.co_selling_office_name = data.CoSellingOfficeName.trim();
  listing.co_selling_office_phone = data.CoSellingOfficePhone.trim();
  listing.list_agent_mui = parseInt(data.ListAgent_MUI) || 0;
  listing.list_agent_direct_work_phone = data.ListAgentDirectWorkPhone.trim();
  listing.list_agent_email = data.ListAgentEmail.trim();
  listing.list_agent_full_name = data.ListAgentFullName.trim();
  listing.list_agent_mls_id = data.ListAgentMLSID.trim();
  listing.co_list_agent_mui = parseInt(data.CoListAgent_MUI) || 0;
  listing.co_list_agent_direct_work_phone = data.CoListAgentDirectWorkPhone.trim();
  listing.co_list_agent_email = data.CoListAgentEmail.trim();
  listing.co_list_agent_full_name = data.CoListAgentFullName.trim();
  listing.co_list_agent_mls_id = data.CoListAgentMLSID.trim();
  listing.selling_agent_mui = parseInt(data.SellingAgent_MUI) || 0;
  listing.selling_agent_direct_work_phone = data.SellingAgentDirectWorkPhone.trim();
  listing.selling_agent_email = data.SellingAgentEmail.trim();
  listing.selling_agent_full_name = data.SellingAgentFullName.trim();
  listing.selling_agent_mls_id = data.SellingAgentMLSID.trim();
  listing.co_selling_agent_mui = parseInt(data.CoSellingAgent_MUI) || 0;
  listing.co_selling_agent_direct_work_phone = data.CoSellingAgentDirectWorkPhone.trim();
  listing.co_selling_agent_email = data.CoSellingAgentEmail.trim();
  listing.co_selling_agent_full_name = data.CoSellingAgentFullName.trim();
  listing.co_selling_agent_mls_id = data.CoSellingAgentMLSID.trim();
  listing.listing_agreement = data.ListingAgreement.trim();
  listing.possession = data.Possession.trim();
  listing.capitalization_rate = data.CapitalizationRate.trim();
  listing.compensation_paid = data.CompensationPaid.trim();
  listing.date_available = data.DateAvailable.trim();
  listing.last_status = data.LastStatus.trim();
  listing.mls_area_major = data.MLSAreaMajor.trim();
  listing.mls_area_minor = data.MLSAreaMinor.trim();
  listing.mls = data.MLS.trim();
  listing.move_in_date = data.MoveInDate.trim();
  listing.permit_address_internet_yn = Boolean(parseInt(data.PermitAddressInternetYN.trim()));
  listing.permit_comments_reviews_yn = Boolean(parseInt(data.PermitCommentsReviewsYN.trim()));
  listing.permit_internet_yn = Boolean(parseInt(data.PermitInternetYN.trim()));
  listing.price_change_timestamp = data.PriceChangeTimestamp.trim();
  listing.matrix_modified_dt = data.MatrixModifiedDT.trim();
  listing.property_association_fees = data.PropertyAssociationFees.trim();
  listing.showing_instructions_type = data.ShowingInstructionsType.trim();
  listing.special_notes = data.SpecialNotes.trim();
  listing.tax_legal_description = data.TaxLegalDescription.trim();
  listing.total_annual_expenses_include = data.TotalAnnualExpensesInclude.trim();
  listing.transaction_type = data.TransactionType.trim();
  listing.virtual_tour_url_branded = data.VirtualTourURLBranded.trim();
  listing.virtual_tour_url_unbranded = data.VirtualTourURLUnbranded.trim();
  listing.active_option_contract_date = data.ActiveOptionContractDate.trim();
  listing.keybox_type = data.KeyBoxType.trim();
  listing.keybox_number = data.KeyboxNumber.trim();
  listing.close_date = data.CloseDate.trim();
  listing.back_on_market_date = data.BackOnMarketDate.trim();
  listing.deposit_amount = parseFloat(data.DepositAmount.trim()) || 0.0;

  listing.photo_count = parseInt(data.PhotoCount.trim()) || 0;

  // Ugly hacks and fixes
  if (property.property_subtype === '')
    property.property_subtype = 'Unknown';

  if (property.property_type === '')
    property.property_type = 'Unknown';

  if (listing.status === '')
    listing.status = 'Unknown';

  if (listing.last_status === '')
    listing.last_status = 'Unknown';

  async.waterfall([
    function(cb) {
      Address.getByMUI(data.Matrix_Unique_ID, function(err, current) {
        if (err) {
          if (err.code == 'ResourceNotFound') {
            console.log('CREATED an ADDRESS'.green);
            Address.create(address, function(err, address_id) {
              if(err)
                return cb(err);

              createdAddresses++;
              Address.updateGeo(address_id, function(err, result) {
                console.log('updating GEO information on address with id:', address_id);
                if(err)
                  return cb(err);

                if (result)
                  geocodedAddresses++;
                return cb(null, address_id);
              });
            });
          }
          else {
            return cb(err);
          }
        } else {
          Address.update(current.id, address, function(err, next) {
            if(err)
              return cb(err);

            updatedAddresses++;
            console.log('UPDATED an ADDRESS'.yellow);
            return cb(null, next.id);
          });
        }
      });
    },
    function(address_id, cb) {
      property.address_id = address_id;

      Property.getByMUI(data.Matrix_Unique_ID, function(err, current) {
        if(err) {
          if(err.code == 'ResourceNotFound') {
            console.log('CREATED a PROPERTY'.green);
            createdProperties++;
            return Property.create(property, cb);
          }

          return cb(err);
        }

        Property.update(current.id, property, function(err, next) {
          if(err)
            return cb(err);

          updatedProperties++;
          console.log('UPDATED a PROPERTY'.yellow);
          return cb(null, next.id);
        });
      });
    },
    function(property_id, cb) {
      listing.property_id = property_id;

      Listing.getByMUI(data.Matrix_Unique_ID, function(err, current) {
        if (err) {
          if (err.code === 'ResourceNotFound') {
            async.waterfall([
              function(cb) {
                if (!program.enablePhotoFetch)
                  return cb(null, []);

                client.getPhotos("Property", config.ntreis.gallery, data.Matrix_Unique_ID, function(err, images) {
                  if (err)
                    return cb(null, []);

                  async.map(images, function(image, cb) {
                    if (typeof(image.buffer) === 'object') {
                      s3ResourcesCreated++;
                      return S3.upload(config.buckets.listing_images, {body: image.buffer, ext: config.ntreis.default_photo_ext}, cb);
                    }

                    return cb(null, null);
                  }, function(err, links) {
                       if(err)
                         return cb(null, []);

                       return cb(null, links);
                     });
                });
              },
              function(links, cb) {
                links = links.filter(Boolean);
                listing.cover = links[0] || '';

                // If array length is greater than 2, we shuffle everything except the first element which is always our cover
                // This fixes issue #17 and is caused by duplicate photos being returned by the NTREIS
                // We shuffle them to make duplicate images less annoying.
                // I hate this hack.
                links = (links.length > 2) ? Array.prototype.concat(links.slice(0, 1), _u.shuffle(links.slice(1))) : links;
                listing.gallery_images = "{" + links.join(',') + "}";

                if (program.enableCfLinks) console.log('CloudFront Resources:'.blue, links);
                console.log('CREATED a LISTING'.green);
                Listing.create(listing, function(err, next) {
                  if(err)
                    return cb(err);

                  createdListings++;
                  return cb(null, next);
                });
              }
            ], function(err, results) {
                 if(err)
                   return cb(err);

                 return cb(null, results);
               });
          } else {
            return cb(err);
          }
        }
        else {
          Listing.update(current.id, listing, function(err, next) {
            if(err)
              return cb(err);

            updatedListings++;
            console.log('UPDATED a LISTING'.yellow);
            return cb(null, next.id);
          });
        }
      });
    }
  ], function(err, result) {
       if(err)
         return cb(err);

       return cb(null, {address: address, listing: listing, property: property, listing_id: result});
     });
}

function fetch() {
  var startTime = (new Date()).getTime();
  async.auto({
    last_run: function(cb) {
      if (program.initial) {
        if (timing.last_id)
          return cb(null, (timing.last_id));

        var initial = '0';
        return cb(null, initial);
      } else {
        if (timing.last_run)
          return cb(null, timing.last_run);

        var initial = new Date(Date.now() - timing.initial * 24 * 3600 * 1000);
        return cb(null, initial.toNTREISString());
      }
    },
    mls: ['last_run',
          function(cb, results) {
            console.log('Fetching listings with', ((program.initial) ? 'Matrix_Unique_ID greater than' : 'modification time after'), results.last_run.cyan);
            client.once('connection.success', function() {
              client.getTable("Property", "Listing");
              var fields;
              var query = (program.initial) ? ('(MATRIX_UNIQUE_ID=' + results.last_run + '+),(STATUS=A,AC,AOC,AKO)') : ('(MatrixModifiedDT=' + results.last_run + ')')
              console.log('Notice:'.cyan, 'Performing', query);
              client.once('metadata.table.success', function(table) {
                fields = table.Fields;

                client.query("Property",
                             "Listing",
                             query,
                             function(err, data) {
                               if (err)
                                 return cb(err);

                               data.sort((program.initial) ? byMatrix_Unique_ID : byMatrixModifiedDT);
                               totalItems = data.length;
                               itemsStart = data[0];
                               itemsEnd = data[data.length-1];

                               console.log('INFO: Received'.cyan, data.length, 'entries between'.cyan,
                                           itemsStart.MatrixModifiedDT.yellow,
                                           '(' + itemsStart.Matrix_Unique_ID.red + ')',
                                           '<->'.cyan,
                                           itemsEnd.MatrixModifiedDT.yellow,
                                           '(' + itemsEnd.Matrix_Unique_ID.red + ')',
                                           'Limiting to'.cyan, program.limit);
                               var limited_data = data.slice(0, program.limit);

                               return cb(null, limited_data);
                             });
              });
            });
          }],
    objects: ['mls',
              function(cb, results) {
                async.mapLimit(results.mls, config.ntreis.parallel, createObjects, function(err, objects) {
                  if(err) {
                    return cb(err);
                  }

                  return cb(null, objects);
                });
              }],
    recs: ['objects',
           function(cb, results) {
             if(!program.enableRecs)
               return cb(null, false);

             var listing_ids = results.objects.map(function(r) {
                                 return r.listing_id;
                               });

             async.map(listing_ids, Recommendation.generateForListing, function(err, recs) {
               if(err)
                 return cb(err);

               return cb(null, recs);
             });
           }],
    update_last_run: ['mls', 'objects',
                      function(cb, results) {
                        var last_item = results.mls[results.mls.length - 1];

                        if (program.initial) {
                          var last_run = last_item.Matrix_Unique_ID;
                          timing.last_id = last_run;

                          fs.writeFileSync("timing.config.js", JSON.stringify(timing, null, 2));
                          return cb(null, false);
                        } else {
                          var last_run = applyTimeDelta(last_item.MatrixModifiedDT + 'Z');
                          timing.last_run = last_run;

                          fs.writeFileSync("timing.config.js", JSON.stringify(timing, null, 2));
                          return cb(null, false);
                        }
                      }
                     ]
  }, function(err, results) {
       var endTime = (new Date()).getTime();
       var elapsed = (endTime - startTime) / 1000;
       var remaining = parseInt(config.ntreis.pause - elapsed);
       payload.text = 'Fetch completed in ' + elapsed + ' seconds. Received total of ' +
         totalItems + ' items between: ' +
         itemsStart.MatrixModifiedDT + '(' + itemsStart.Matrix_Unique_ID + ')' + ' <-> ' +
         itemsEnd.MatrixModifiedDT + '(' + itemsEnd.Matrix_Unique_ID + ')' + ' Summary: ' +
         createdListings + ' New Listings, ' + updatedListings + ' Updated Listings, ' +
         createdProperties + ' New Properties, ' + updatedProperties + ' Updated Properties, ' +
         createdAddresses + ' New Addresses, '  + updatedAddresses + ' Updated Addresses, ' +
         s3ResourcesCreated + ' New Images uploaded to S3, ' +
         geocodedAddresses + ' Addresses Geocoded successfully using GoogleMapsAPI, ' +
         Math.round(((createdAddresses - geocodedAddresses) / createdAddresses) * 100) + '% miss rate on GoogleMapsAPI, ' +
         'pausing for ' + remaining + ' seconds before running the next fetch.' + ' Exit status: ' +
         ((err) ? 'FAILURE' : 'OK') + ' Error: ' + err;

       console.log('Info:'.yellow, payload.text);
       options.form.payload = JSON.stringify(payload);

       request.post(options, function(err, res, body) {
         if(err) {
           console.log('Error sending update to slack:', err);
         }

         console.log('Total Running Time:', elapsed + 's');
         if(err)
           console.log('INFO: (TERM) Script terminated with error:'.red, err);
         else {
           console.log('INFO: (TERM) Script finished successfully'.green);
         }

         if (remaining > 0) {
           console.log('Pausing for'.yellow,
                       remaining,
                       'seconds before termination to meet NTREIS limit on heavy requests...'.yellow);
           sleep.sleep(remaining);
           process.exit(0);
         } else {
           process.exit(0);
         }
       });
     });
}

init();
fetch();