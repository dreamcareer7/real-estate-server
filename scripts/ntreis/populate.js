module.exports = (data) => {
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
  address.matrix_unique_id = parseInt(data.Matrix_Unique_ID) || -1;
  address.county_or_parish = data.CountyOrParish.trim();
  address.directions = data.Directions.trim();
  address.street_dir_prefix = data.StreetDirPrefix.trim();
  address.street_dir_suffix = data.StreetDirSuffix.trim();
  address.street_number_searchable = data.StreetNumberSearchable.trim();

  property.bedroom_count = parseInt(data.BedsTotal) || -1;
  property.bathroom_count = parseFloat(data.BathsTotal) || -1.0;
  property.half_bathroom_count = parseFloat(data.BathsHalf) || -1.0;
  property.full_bathroom_count = parseFloat(data.BathsFull) || -1.0;
  property.description = data.PublicRemarks.trim();
  property.square_meters = (parseFloat(data.SqFtTotal) || 0.0 ) / 10.764;
  property.lot_square_meters = (parseFloat(data.LotSizeAreaSQFT) || 0.0) / 10.764;
  property.property_type = data.PropertyType.trim();
  property.property_subtype = data.PropertySubType.trim();
  property.matrix_unique_id = parseInt(data.Matrix_Unique_ID) || -1;
  property.year_built = parseInt(data.YearBuilt) || -1;
  property.parking_spaces_covered_total = parseFloat(data.ParkingSpacesCoveredTotal) || -1.0;
  property.heating = '{' + data.Heating + '}';
  property.flooring = '{' + data.Flooring + '}';
  property.utilities = '{' + data.Utilities + '}';
  property.utilities_other = '{' + data.UtilitiesOther + '}';
  property.architectural_style = data.ArchitecturalStyle.trim();
  property.structural_style = data.StructuralStyle.trim();
  property.number_of_stories = parseInt(data.NumberOfStories) || -1;
  property.number_of_stories_in_building = parseInt(data.NumberOfStoriesInBuilding) || -1;
  property.number_of_parking_spaces = parseFloat(data.NumberOfParkingSpaces) || -1.0;
  property.parking_spaces_carport = parseFloat(data.ParkingSpacesCarport) || -1.0;
  property.parking_spaces_garage = parseFloat(data.ParkingSpacesGarage) || -1.0;
  property.garage_length = parseFloat(data.GarageLength) || -1.0;
  property.garage_width = parseFloat(data.GarageWidth) || -1.0;
  property.number_of_dining_areas = parseInt(data.NumberOfDiningAreas) || -1;
  property.number_of_living_areas = parseInt(data.NumberOfLivingAreas) || -1;
  property.fireplaces_total = parseInt(data.FireplacesTotal) || -1;
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
  property.ceiling_height = parseFloat(data.CeilingHeight.trim()) || -1.0;
  property.green_building_certification = data.GreenBuildingCertification.trim();
  property.green_energy_efficient = data.GreenEnergyEfficient.trim();
  property.lot_size = parseFloat(data.LotSize.trim()) || -1.0;
  property.lot_size_area = parseFloat(data.LotSizeArea.trim()) || -1.0;
  property.lot_size_dimensions = data.LotSizeDimensions.trim();
  property.map_coordinates = data.MapCoordinates.trim();
  property.number_of_pets_allowed = parseInt(data.NumberOfPetsAllowed.trim()) || -1;
  property.number_of_units = parseInt(data.NumberOfUnits.trim()) || -1;
  property.pets_yn = Boolean(parseInt(data.PetsYN.trim()));
  property.photo_count = parseInt(data.PhotoCount.trim()) || -1;
  property.room_count = parseInt(data.RoomCount.trim()) || -1;
  property.subdivided_yn = Boolean(parseInt(data.SubdividedYN.trim()));
  property.surface_rights = data.SurfaceRights.trim();
  property.unit_count = parseInt(data.UnitCount.trim()) || -1;
  property.year_built_details = data.YearBuiltDetails.trim();
  property.zoning = data.Zoning.trim();
  property.security_system_yn = Boolean(parseInt(data.SecuritySystemYN.trim()));

  listing.currency = 'USD';
  listing.price = parseFloat(data.ListPrice) || 0;
  listing.status = data.Status.trim();
  listing.matrix_unique_id = parseInt(data.Matrix_Unique_ID) || -1;
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
  listing.list_office_mui = parseInt(data.ListOffice_MUI) || -1;
  listing.list_office_mls_id = data.ListOfficeMLSID.trim();
  listing.list_office_name = data.ListOfficeName.trim();
  listing.list_office_phone = data.ListOfficePhone.trim();
  listing.co_list_office_mui = parseInt(data.CoListOffice_MUI) || -1;
  listing.co_list_office_mls_id = data.CoListOfficeMLSID.trim();
  listing.co_list_office_name = data.CoListOfficeName.trim();
  listing.co_list_office_phone = data.CoListOfficePhone.trim();
  listing.selling_office_mui = parseInt(data.SellingOffice_MUI) || -1;
  listing.selling_office_mls_id = data.SellingOfficeMLSID.trim();
  listing.selling_office_name = data.SellingOfficeName.trim();
  listing.selling_office_phone = data.SellingOfficePhone.trim();
  listing.co_selling_office_mui = parseInt(data.CoSellingOffice_MUI) || -1;
  listing.co_selling_office_mls_id = data.CoSellingOfficeMLSID.trim();
  listing.co_selling_office_name = data.CoSellingOfficeName.trim();
  listing.co_selling_office_phone = data.CoSellingOfficePhone.trim();
  listing.list_agent_mui = parseInt(data.ListAgent_MUI) || -1;
  listing.list_agent_direct_work_phone = data.ListAgentDirectWorkPhone.trim();
  listing.list_agent_email = data.ListAgentEmail.trim();
  listing.list_agent_full_name = data.ListAgentFullName.trim();
  listing.list_agent_mls_id = data.ListAgentMLSID.trim();
  listing.co_list_agent_mui = parseInt(data.CoListAgent_MUI) || -1;
  listing.co_list_agent_direct_work_phone = data.CoListAgentDirectWorkPhone.trim();
  listing.co_list_agent_email = data.CoListAgentEmail.trim();
  listing.co_list_agent_full_name = data.CoListAgentFullName.trim();
  listing.co_list_agent_mls_id = data.CoListAgentMLSID.trim();
  listing.selling_agent_mui = parseInt(data.SellingAgent_MUI) || -1;
  listing.selling_agent_direct_work_phone = data.SellingAgentDirectWorkPhone.trim();
  listing.selling_agent_email = data.SellingAgentEmail.trim();
  listing.selling_agent_full_name = data.SellingAgentFullName.trim();
  listing.selling_agent_mls_id = data.SellingAgentMLSID.trim();
  listing.co_selling_agent_mui = parseInt(data.CoSellingAgent_MUI) || -1;
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
  listing.dom = parseInt(data.DOM.trim()) || -1;
  listing.cdom = parseInt(data.DOM.trim()) || -1;

  // Ugly hacks and fixes
  if (property.property_subtype === '')
    property.property_subtype = 'Unknown';

  if (property.property_type === '')
    property.property_type = 'Unknown';

  if (listing.status === '')
    listing.status = 'Unknown';

  if (listing.last_status === '')
    listing.last_status = 'Unknown';

  return {
    address,
    property,
    listing
  };
};
