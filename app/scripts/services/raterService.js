'use strict';

proySymphony.service('raterService', function(dataFactory, $rootScope, metaService, _, usefulTools) {

    var service = {
        raters: {},
        get getHawksoftFieldsByType() {
            return this.filteredRaters({
                name: "Hawksoft"
            });
        }
    };


    service.loadRaters = function() {
        var rater = {
            name: "Hawksoft",
            quote_type: "Commercial",
            fields: {
                "gen_bBusinessType": {
                    "fieldName": null,
                    "fieldValue": null
                },
                "gen_sCustType": {
                    "fieldName": null,
                    "fieldValue": null
                },
                "gen_sBusinessName": {
                    "fieldName": null,
                    "fieldValue": null
                },
                "gen_sDBAName": {
                    "fieldName": null,
                    "fieldValue": null
                },
                "gen_sLastName": {
                    "fieldName": null,
                    "fieldValue": null
                },
                "gen_sFirstName": {
                    "fieldName": null,
                    "fieldValue": null
                },
                "gen_cInitial": {
                    "fieldName": null,
                    "fieldValue": null
                },
                "gen_sAddress1": {
                    "fieldName": null,
                    "fieldValue": null
                },
                "gen_sCity": {
                    "fieldName": null,
                    "fieldValue": null
                },
                "gen_sState": {
                    "fieldName": null,
                    "fieldValue": null
                },
                "gen_sZip": {
                    "fieldName": null,
                    "fieldValue": null
                },
                "gen_sFEIN": {
                    "fieldName": null,
                    "fieldValue": null
                },
                "gen_sBusinessLicense": {
                    "fieldName": null,
                    "fieldValue": null
                },
                "gen_sClientSource": {
                    "fieldName": null,
                    "fieldValue": null
                },
                "gen_sClientNotes": {
                    "fieldName": null,
                    "fieldValue": null
                },
                "gen_sNAICS": {
                    "fieldName": null,
                    "fieldValue": null
                },
                "gen_sWebsite": {
                    "fieldName": null,
                    "fieldValue": null
                },
                "gen_sPhone": {
                    "fieldName": null,
                    "fieldValue": null
                },
                "gen_sWorkPhone": {
                    "fieldName": null,
                    "fieldValue": null
                },
                "gen_sFax": {
                    "fieldName": null,
                    "fieldValue": null
                },
                "gen_sPager": {
                    "fieldName": null,
                    "fieldValue": null
                },
                "gen_sCellPhone": {
                    "fieldName": null,
                    "fieldValue": null
                },
                "gen_sMsgPhone": {
                    "fieldName": null,
                    "fieldValue": null
                },
                "gen_sEmail": {
                    "fieldName": null,
                    "fieldValue": null
                },
                "gen_lClientOffice": {
                    "fieldName": null,
                    "fieldValue": null
                },
                "gen_sClientMiscData": {
                    "isArray": true,
                    "data": [{
                        "fieldName": null,
                        "fieldValue": null
                    }]
                },
                "gen_sClientMiscPrompt": {
                    "isArray": true,
                    "data": [{
                        "fieldName": null,
                        "fieldValue": null
                    }]
                },
                "gen_sClientMiscRData": {
                    "isArray": true,
                    "data": [{
                        "fieldName": null,
                        "fieldValue": null
                    }]
                },
                "gen_sClientMiscRPrompt": {
                    "isArray": true,
                    "data": [{
                        "fieldName": null,
                        "fieldValue": null
                    }]
                },
                "gen_nClientStatus": {
                    "fieldName": null,
                    "fieldValue": null
                },
                "gen_sAgencyID": {
                    "fieldName": null,
                    "fieldValue": null
                },
                "gen_sCMSPolicyType": {
                    "fieldName": null,
                    "fieldValue": null
                },
                "gen_sPolicyType": {
                    "fieldName": null,
                    "fieldValue": null
                },
                "gen_sACORDTypeCode": {
                    "fieldName": null,
                    "fieldValue": null
                },
                "gen_sLOBCode": {
                    "fieldName": null,
                    "fieldValue": null
                },
                "gen_sCompany": {
                    "fieldName": null,
                    "fieldValue": null
                },
                "gen_tProductionDate": {
                    "fieldName": null,
                    "fieldValue": null
                },
                "gen_tExpirationDate": {
                    "fieldName": null,
                    "fieldValue": null
                },
                "gen_tEffectiveDate": {
                    "fieldName": null,
                    "fieldValue": null
                },
                "gen_sLeadSource": {
                    "fieldName": null,
                    "fieldValue": null
                },
                "gen_dTotal": {
                    "fieldName": null,
                    "fieldValue": null
                },
                "gen_nTerm": {
                    "fieldName": null,
                    "fieldValue": null
                },
                "gen_sStatus": {
                    "fieldName": null,
                    "fieldValue": null
                },
                "gen_sFSCNotes": {
                    "fieldName": null,
                    "fieldValue": null
                },
                "gen_sProducer": {
                    "fieldName": null,
                    "fieldValue": null
                },
                "gen_Coverage": {
                    "isArray": true,
                    "data": [{
                        "fieldName": null,
                        "fieldValue": null
                    }]
                },
                "gen_CoverageLimits": {
                    "isArray": true,
                    "data": [{
                        "fieldName": null,
                        "fieldValue": null
                    }]
                },
                "gen_CoverageDeds": {
                    "isArray": true,
                    "data": [{
                        "fieldName": null,
                        "fieldValue": null
                    }]
                }
            }
        };
        var rater1 = {
            name: "Hawksoft",
            quote_type: "Home",
            fields: {
                "gen_bBusinessType": {
                    "fieldName": null,
                    "fieldValue": null
                },
                "gen_sCustType": {
                    "fieldName": null,
                    "fieldValue": null
                },
                "gen_sBusinessName": {
                    "fieldName": null,
                    "fieldValue": null
                },
                "gen_sDBAName": {
                    "fieldName": null,
                    "fieldValue": null
                },
                "gen_sLastName": {
                    "fieldName": null,
                    "fieldValue": null
                },
                "gen_sFirstName": {
                    "fieldName": null,
                    "fieldValue": null
                },
                "gen_cInitial": {
                    "fieldName": null,
                    "fieldValue": null
                },
                "gen_sAddress1": {
                    "fieldName": null,
                    "fieldValue": null
                },
                "gen_sCity": {
                    "fieldName": null,
                    "fieldValue": null
                },
                "gen_sState": {
                    "fieldName": null,
                    "fieldValue": null
                },
                "gen_sZip": {
                    "fieldName": null,
                    "fieldValue": null
                },
                "gen_sFEIN": {
                    "fieldName": null,
                    "fieldValue": null
                },
                "gen_sBusinessLicense": {
                    "fieldName": null,
                    "fieldValue": null
                },
                "gen_sClientSource": {
                    "fieldName": null,
                    "fieldValue": null
                },
                "gen_sClientNotes": {
                    "fieldName": null,
                    "fieldValue": null
                },
                "gen_sNAICS": {
                    "fieldName": null,
                    "fieldValue": null
                },
                "gen_sWebsite": {
                    "fieldName": null,
                    "fieldValue": null
                },
                "gen_sPhone": {
                    "fieldName": null,
                    "fieldValue": null
                },
                "gen_sWorkPhone": {
                    "fieldName": null,
                    "fieldValue": null
                },
                "gen_sFax": {
                    "fieldName": null,
                    "fieldValue": null
                },
                "gen_sPager": {
                    "fieldName": null,
                    "fieldValue": null
                },
                "gen_sCellPhone": {
                    "fieldName": null,
                    "fieldValue": null
                },
                "gen_sMsgPhone": {
                    "fieldName": null,
                    "fieldValue": null
                },
                "gen_sEmail": {
                    "fieldName": null,
                    "fieldValue": null
                },
                "gen_lClientOffice": {
                    "fieldName": null,
                    "fieldValue": null
                },
                "gen_sClientMiscData": {
                    "isArray": true,
                    "data": [{
                        "fieldName": null,
                        "fieldValue": null
                    }]
                },
                "gen_sClientMiscPrompt": {
                    "isArray": true,
                    "data": [{
                        "fieldName": null,
                        "fieldValue": null
                    }]
                },
                "gen_sClientMiscRData": {
                    "isArray": true,
                    "data": [{
                        "fieldName": null,
                        "fieldValue": null
                    }]
                },
                "gen_sClientMiscRPrompt": {
                    "isArray": true,
                    "data": [{
                        "fieldName": null,
                        "fieldValue": null
                    }]
                },
                "gen_sDefaultSuspenseUser": {
                    "fieldName": null,
                    "fieldValue": null
                },
                "gen_tDefaultSuspenseDate": {
                    "fieldName": null,
                    "fieldValue": null
                },
                "gen_nDefaultSuspenseDays": {
                    "fieldName": null,
                    "fieldValue": null
                },
                "gen_sCMSPolicyType": {
                    "fieldName": null,
                    "fieldValue": null
                },
                "gen_sCompanyQuotedLong": {
                    "fieldName": null,
                    "fieldValue": null
                },
                "gen_sForm": {
                    "fieldName": null,
                    "fieldValue": null
                },
                "gen_sPolicyNumber": {
                    "fieldName": null,
                    "fieldValue": null
                },
                "gen_tProductionDate": {
                    "fieldName": null,
                    "fieldValue": null
                },
                "gen_tExpirationDate": {
                    "fieldName": null,
                    "fieldValue": null
                },
                "gen_tEffectiveDate": {
                    "fieldName": null,
                    "fieldValue": null
                },
                "gen_sPayPlanTitle": {
                    "fieldName": null,
                    "fieldValue": null
                },
                "gen_sLeadSource": {
                    "fieldName": null,
                    "fieldValue": null
                },
                "gen_dTotal": {
                    "fieldName": null,
                    "fieldValue": null
                },
                "gen_nTerm": {
                    "fieldName": null,
                    "fieldValue": null
                },
                "gen_nClientStatus": {
                    "fieldName": null,
                    "fieldValue": null
                },
                "gen_sStatus": {
                    "fieldName": null,
                    "fieldValue": null
                },
                "gen_sFSCNotes": {
                    "fieldName": null,
                    "fieldValue": null
                },
                "gen_dFilingFee": {
                    "fieldName": null,
                    "fieldValue": null
                },
                "gen_dPolicyFee": {
                    "fieldName": null,
                    "fieldValue": null
                },
                "gen_dBrokerFee": {
                    "fieldName": null,
                    "fieldValue": null
                },
                "gen_sProducer": {
                    "fieldName": null,
                    "fieldValue": null
                },
                "gen_sGAddress": {
                    "fieldName": null,
                    "fieldValue": null
                },
                "gen_sGCity": {
                    "fieldName": null,
                    "fieldValue": null
                },
                "gen_sCounty": {
                    "fieldName": null,
                    "fieldValue": null
                },
                "gen_sGState": {
                    "fieldName": null,
                    "fieldValue": null
                },
                "gen_sGZip": {
                    "fieldName": null,
                    "fieldValue": null
                },
                "gen_nAdditionalRes": {
                    "fieldName": null,
                    "fieldValue": null
                },
                "gen_sProgram": {
                    "fieldName": null,
                    "fieldValue": null
                },
                "gen_sProtectionClass": {
                    "fieldName": null,
                    "fieldValue": null
                },
                "gen_nYearBuilt": {
                    "fieldName": null,
                    "fieldValue": null
                },
                "gen_sConstruction": {
                    "fieldName": null,
                    "fieldValue": null
                },
                "gen_sBurgAlarm": {
                    "fieldName": null,
                    "fieldValue": null
                },
                "gen_sFireAlarm": {
                    "fieldName": null,
                    "fieldValue": null
                },
                "gen_sLpName1": {
                    "fieldName": null,
                    "fieldValue": null
                },
                "gen_sLPName1Line2": {
                    "fieldName": null,
                    "fieldValue": null
                },
                "gen_sLpAddress1": {
                    "fieldName": null,
                    "fieldValue": null
                },
                "gen_sLpCity1": {
                    "fieldName": null,
                    "fieldValue": null
                },
                "gen_sLpState1": {
                    "fieldName": null,
                    "fieldValue": null
                },
                "gen_sLpZip1": {
                    "fieldName": null,
                    "fieldValue": null
                },
                "gen_sLpLoanNumber1": {
                    "fieldName": null,
                    "fieldValue": null
                },
                "gen_sLpName2": {
                    "fieldName": null,
                    "fieldValue": null
                },
                "gen_sLPName2Line2": {
                    "fieldName": null,
                    "fieldValue": null
                },
                "gen_sLpAddress2": {
                    "fieldName": null,
                    "fieldValue": null
                },
                "gen_sLpCity2": {
                    "fieldName": null,
                    "fieldValue": null
                },
                "gen_sLpState2": {
                    "fieldName": null,
                    "fieldValue": null
                },
                "gen_sLpZip2": {
                    "fieldName": null,
                    "fieldValue": null
                },
                "gen_sLpLoanNumber2": {
                    "fieldName": null,
                    "fieldValue": null
                },
                "gen_bDeadBolt": {
                    "fieldName": null,
                    "fieldValue": null
                },
                "gen_bFireExtinguisher": {
                    "fieldName": null,
                    "fieldValue": null
                },
                "gen_sSprinkler": {
                    "fieldName": null,
                    "fieldValue": null
                },
                "gen_sBoatType1": {
                    "fieldName": null,
                    "fieldValue": null
                },
                "gen_nHorsePower1": {
                    "fieldName": null,
                    "fieldValue": null
                },
                "gen_nSpeed1": {
                    "fieldName": null,
                    "fieldValue": null
                },
                "gen_nLength1": {
                    "fieldName": null,
                    "fieldValue": null
                },
                "gen_sBoatType2": {
                    "fieldName": null,
                    "fieldValue": null
                },
                "gen_nHorsePower2": {
                    "fieldName": null,
                    "fieldValue": null
                },
                "gen_nSpeed2": {
                    "fieldName": null,
                    "fieldValue": null
                },
                "gen_nLength2": {
                    "fieldName": null,
                    "fieldValue": null
                },
                "gen_lJewelry": {
                    "fieldName": null,
                    "fieldValue": null
                },
                "gen_lFurs": {
                    "fieldName": null,
                    "fieldValue": null
                },
                "gen_lGuns": {
                    "fieldName": null,
                    "fieldValue": null
                },
                "gen_lCameras": {
                    "fieldName": null,
                    "fieldValue": null
                },
                "gen_lCoins": {
                    "fieldName": null,
                    "fieldValue": null
                },
                "gen_lStamps": {
                    "fieldName": null,
                    "fieldValue": null
                },
                "gen_lSilverware": {
                    "fieldName": null,
                    "fieldValue": null
                },
                "gen_lFineArt": {
                    "fieldName": null,
                    "fieldValue": null
                },
                "gen_lGolfEquip": {
                    "fieldName": null,
                    "fieldValue": null
                },
                "gen_lMusicalInst": {
                    "fieldName": null,
                    "fieldValue": null
                },
                "gen_lElectronics": {
                    "fieldName": null,
                    "fieldValue": null
                },
                "gen_bHomeReplacement": {
                    "fieldName": null,
                    "fieldValue": null
                },
                "gen_lCovA": {
                    "fieldName": null,
                    "fieldValue": null
                },
                "gen_lCovB": {
                    "fieldName": null,
                    "fieldValue": null
                },
                "gen_lCovC": {
                    "fieldName": null,
                    "fieldValue": null
                },
                "gen_lCovD": {
                    "fieldName": null,
                    "fieldValue": null
                },
                "gen_cContentsReplacement": {
                    "fieldName": null,
                    "fieldValue": null
                },
                "gen_bSpecialPP": {
                    "fieldName": null,
                    "fieldValue": null
                },
                "gen_sLiability": {
                    "fieldName": null,
                    "fieldValue": null
                },
                "gen_sMedical": {
                    "fieldName": null,
                    "fieldValue": null
                },
                "gen_sDeduct": {
                    "fieldName": null,
                    "fieldValue": null
                },
                "gen_bEarthquake": {
                    "fieldName": null,
                    "fieldValue": null
                },
                "gen_sEQDeduct": {
                    "fieldName": null,
                    "fieldValue": null
                },
                "gen_bEQMasonryVeneer": {
                    "fieldName": null,
                    "fieldValue": null
                },
                "gen_lOrdinanceOrLawIncr": {
                    "fieldName": null,
                    "fieldValue": null
                },
                "gen_bMultiPolicy": {
                    "fieldName": null,
                    "fieldValue": null
                },
                "hpm_sTerritory": {
                    "fieldName": null,
                    "fieldValue": null
                },
                "hpm_sEarthquakeZone": {
                    "fieldName": null,
                    "fieldValue": null
                },
                "hpm_sPremiumGroup": {
                    "fieldName": null,
                    "fieldValue": null
                },
                "hpm_dDwelling": {
                    "fieldName": null,
                    "fieldValue": null
                },
                "hpm_dOtherStructures": {
                    "fieldName": null,
                    "fieldValue": null
                },
                "hpm_dPersonalProp": {
                    "fieldName": null,
                    "fieldValue": null
                },
                "hpm_dLossOfUse": {
                    "fieldName": null,
                    "fieldValue": null
                },
                "hpm_dLiability": {
                    "fieldName": null,
                    "fieldValue": null
                },
                "hpm_dMedical": {
                    "fieldName": null,
                    "fieldValue": null
                },
                "hpm_dAdditionalRes": {
                    "fieldName": null,
                    "fieldValue": null
                },
                "hpm_dHomeReplacement": {
                    "fieldName": null,
                    "fieldValue": null
                },
                "hpm_dWatercraft": {
                    "fieldName": null,
                    "fieldValue": null
                },
                "hpm_dEarthquake": {
                    "fieldName": null,
                    "fieldValue": null
                },
                "hpm_dDeductible": {
                    "fieldName": null,
                    "fieldValue": null
                },
                "hpm_dJewelry": {
                    "fieldName": null,
                    "fieldValue": null
                },
                "hpm_dFurs": {
                    "fieldName": null,
                    "fieldValue": null
                },
                "hpm_dGuns": {
                    "fieldName": null,
                    "fieldValue": null
                },
                "hpm_dCameras": {
                    "fieldName": null,
                    "fieldValue": null
                },
                "hpm_dCoins": {
                    "fieldName": null,
                    "fieldValue": null
                },
                "hpm_dStamps": {
                    "fieldName": null,
                    "fieldValue": null
                },
                "hpm_dSilverware": {
                    "fieldName": null,
                    "fieldValue": null
                },
                "hpm_dFineArt": {
                    "fieldName": null,
                    "fieldValue": null
                },
                "hpm_dGolfEquip": {
                    "fieldName": null,
                    "fieldValue": null
                },
                "hpm_dMusicalInst": {
                    "fieldName": null,
                    "fieldValue": null
                },
                "hpm_dElectronics": {
                    "fieldName": null,
                    "fieldValue": null
                },
                "hpm_dNewHomeCredit": {
                    "fieldName": null,
                    "fieldValue": null
                },
                "hpm_dProtectiveDeviceCr": {
                    "fieldName": null,
                    "fieldValue": null
                },
                "hpm_dMultiPolicyCredit": {
                    "fieldName": null,
                    "fieldValue": null
                },
                "hpm_dRenewalCredit": {
                    "fieldName": null,
                    "fieldValue": null
                },
                "hpm_dSPPSurcharge": {
                    "fieldName": null,
                    "fieldValue": null
                },
                "hpm_dOrdinanceOrLaw": {
                    "fieldName": null,
                    "fieldValue": null
                },
                "hpm_dSpecialCovA": {
                    "fieldName": null,
                    "fieldValue": null
                }
            }
        };
        var rater2 = {
            name: "Hawksoft",
            quote_type: "Auto",
            fields: {
                "gen_bBusinessType": {
                    "fieldName": null,
                    "fieldValue": null
                },
                "gen_sCustType": {
                    "fieldName": null,
                    "fieldValue": null
                },
                "gen_sBusinessName": {
                    "fieldName": null,
                    "fieldValue": null
                },
                "gen_sDBAName": {
                    "fieldName": null,
                    "fieldValue": null
                },
                "gen_sLastName": {
                    "fieldName": null,
                    "fieldValue": null
                },
                "gen_sFirstName": {
                    "fieldName": null,
                    "fieldValue": null
                },
                "gen_cInitial": {
                    "fieldName": null,
                    "fieldValue": null
                },
                "gen_sAddress1": {
                    "fieldName": null,
                    "fieldValue": null
                },
                "gen_sCity": {
                    "fieldName": null,
                    "fieldValue": null
                },
                "gen_sState": {
                    "fieldName": null,
                    "fieldValue": null
                },
                "gen_sZip": {
                    "fieldName": null,
                    "fieldValue": null
                },
                "gen_sFEIN": {
                    "fieldName": null,
                    "fieldValue": null
                },
                "gen_sBusinessLicense": {
                    "fieldName": null,
                    "fieldValue": null
                },
                "gen_sClientSource": {
                    "fieldName": null,
                    "fieldValue": null
                },
                "gen_sClientNotes": {
                    "fieldName": null,
                    "fieldValue": null
                },
                "gen_sNAICS": {
                    "fieldName": null,
                    "fieldValue": null
                },
                "gen_sWebsite": {
                    "fieldName": null,
                    "fieldValue": null
                },
                "gen_sPhone": {
                    "fieldName": null,
                    "fieldValue": null
                },
                "gen_sWorkPhone": {
                    "fieldName": null,
                    "fieldValue": null
                },
                "gen_sFax": {
                    "fieldName": null,
                    "fieldValue": null
                },
                "gen_sPager": {
                    "fieldName": null,
                    "fieldValue": null
                },
                "gen_sCellPhone": {
                    "fieldName": null,
                    "fieldValue": null
                },
                "gen_sMsgPhone": {
                    "fieldName": null,
                    "fieldValue": null
                },
                "gen_sEmail": {
                    "fieldName": null,
                    "fieldValue": null
                },
                "gen_lClientOffice": {
                    "fieldName": null,
                    "fieldValue": null
                },
                "gen_sClientMiscData": {
                    "isArray": true,
                    "data": [{
                        "fieldName": null,
                        "fieldValue": null
                    }]
                },
                "gen_sClientMiscPrompt": {
                    "isArray": true,
                    "data": [{
                        "fieldName": null,
                        "fieldValue": null
                    }]
                },
                "gen_sClientMiscRData": {
                    "isArray": true,
                    "data": [{
                        "fieldName": null,
                        "fieldValue": null
                    }]
                },
                "gen_sClientMiscRPrompt": {
                    "isArray": true,
                    "data": [{
                        "fieldName": null,
                        "fieldValue": null
                    }]
                },
                "gen_sDefaultSuspenseUser": {
                    "fieldName": null,
                    "fieldValue": null
                },
                "gen_tDefaultSuspenseDate": {
                    "fieldName": null,
                    "fieldValue": null
                },
                "gen_nDefaultSuspenseDays": {
                    "fieldName": null,
                    "fieldValue": null
                },
                "gen_sCMSPolicyType": {
                    "fieldName": null,
                    "fieldValue": null
                },
                "gen_sCompanyQuotedShort": {
                    "fieldName": null,
                    "fieldValue": null
                },
                "gen_tProductionDate": {
                    "fieldName": null,
                    "fieldValue": null
                },
                "gen_tExpirationDate": {
                    "fieldName": null,
                    "fieldValue": null
                },
                "gen_tEffectiveDate": {
                    "fieldName": null,
                    "fieldValue": null
                },
                "gen_sPayPlanTitle": {
                    "fieldName": null,
                    "fieldValue": null
                },
                "gen_sLeadSource": {
                    "fieldName": null,
                    "fieldValue": null
                },
                "gen_dTotal": {
                    "fieldName": null,
                    "fieldValue": null
                },
                "gen_nTerm": {
                    "fieldName": null,
                    "fieldValue": null
                },
                "gen_nClientStatus": {
                    "fieldName": null,
                    "fieldValue": null
                },
                "gen_sStatus": {
                    "fieldName": null,
                    "fieldValue": null
                },
                "gen_sFSCNotes": {
                    "fieldName": null,
                    "fieldValue": null
                },
                "gen_dFilingFee": {
                    "fieldName": null,
                    "fieldValue": null
                },
                "gen_dPolicyFee": {
                    "fieldName": null,
                    "fieldValue": null
                },
                "gen_dBrokerFee": {
                    "fieldName": null,
                    "fieldValue": null
                },
                "gen_sProducer": {
                    "fieldName": null,
                    "fieldValue": null
                },
                "gen_sGAddress": {
                    "fieldName": null,
                    "fieldValue": null
                },
                "gen_sGCity": {
                    "fieldName": null,
                    "fieldValue": null
                },
                "gen_sGState": {
                    "fieldName": null,
                    "fieldValue": null
                },
                "gen_sGZip": {
                    "fieldName": null,
                    "fieldValue": null
                },
                "gen_sBi": {
                    "fieldName": null,
                    "fieldValue": null
                },
                "gen_sPd": {
                    "fieldName": null,
                    "fieldValue": null
                },
                "gen_sUmBi": {
                    "fieldName": null,
                    "fieldValue": null
                },
                "gen_sUimBi": {
                    "fieldName": null,
                    "fieldValue": null
                },
                "gen_sUmPd": {
                    "fieldName": null,
                    "fieldValue": null
                },
                "gen_sUimPd": {
                    "fieldName": null,
                    "fieldValue": null
                },
                "gen_sPipDeduct": {
                    "fieldName": null,
                    "fieldValue": null
                },
                "gen_sPip": {
                    "fieldName": null,
                    "fieldValue": null
                },
                "gen_sMedical": {
                    "fieldName": null,
                    "fieldValue": null
                },
                "gen_sTypeOfPolicy": {
                    "fieldName": null,
                    "fieldValue": null
                },
                "gen_sPolicyNumber": {
                    "fieldName": null,
                    "fieldValue": null
                },
                "veh_sMake": {
                    "isArray": true,
                    "data": [{
                        "fieldName": null,
                        "fieldValue": null
                    }]
                },
                "veh_sModel": {
                    "isArray": true,
                    "data": [{
                        "fieldName": null,
                        "fieldValue": null
                    }]
                },
                "veh_sYr": {
                    "isArray": true,
                    "data": [{
                        "fieldName": null,
                        "fieldValue": null
                    }]
                },
                "veh_sSymb": {
                    "isArray": true,
                    "data": [{
                        "fieldName": null,
                        "fieldValue": null
                    }]
                },
                "veh_sTerr": {
                    "isArray": true,
                    "data": [{
                        "fieldName": null,
                        "fieldValue": null
                    }]
                },
                "veh_lAddOnEquip": {
                    "isArray": true,
                    "data": [{
                        "fieldName": null,
                        "fieldValue": null
                    }]
                },
                "veh_nDriver": {
                    "isArray": true,
                    "data": [{
                        "fieldName": null,
                        "fieldValue": null
                    }]
                },
                "veh_sUse": {
                    "isArray": true,
                    "data": [{
                        "fieldName": null,
                        "fieldValue": null
                    }]
                },
                "veh_nCommuteMileage": {
                    "isArray": true,
                    "data": [{
                        "fieldName": null,
                        "fieldValue": null
                    }]
                },
                "veh_lMileage": {
                    "isArray": true,
                    "data": [{
                        "fieldName": null,
                        "fieldValue": null
                    }]
                },
                "veh_nGVW": {
                    "isArray": true,
                    "data": [{
                        "fieldName": null,
                        "fieldValue": null
                    }]
                },
                "veh_sTowing": {
                    "isArray": true,
                    "data": [{
                        "fieldName": null,
                        "fieldValue": null
                    }]
                },
                "veh_sRentRemb": {
                    "isArray": true,
                    "data": [{
                        "fieldName": null,
                        "fieldValue": null
                    }]
                },
                "veh_sVehicleType": {
                    "isArray": true,
                    "data": [{
                        "fieldName": null,
                        "fieldValue": null
                    }]
                },
                "veh_bFourWD": {
                    "isArray": true,
                    "data": [{
                        "fieldName": null,
                        "fieldValue": null
                    }]
                },
                "veh_sComp": {
                    "isArray": true,
                    "data": [{
                        "fieldName": null,
                        "fieldValue": null
                    }]
                },
                "veh_sColl": {
                    "isArray": true,
                    "data": [{
                        "fieldName": null,
                        "fieldValue": null
                    }]
                },
                "veh_sUmPd": {
                    "isArray": true,
                    "data": [{
                        "fieldName": null,
                        "fieldValue": null
                    }]
                },
                "veh_bUmPd": {
                    "isArray": true,
                    "data": [{
                        "fieldName": null,
                        "fieldValue": null
                    }]
                },
                "veh_sUimPd": {
                    "isArray": true,
                    "data": [{
                        "fieldName": null,
                        "fieldValue": null
                    }]
                },
                "veh_bUimPd": {
                    "isArray": true,
                    "data": [{
                        "fieldName": null,
                        "fieldValue": null
                    }]
                },
                "veh_sVIN": {
                    "isArray": true,
                    "data": [{
                        "fieldName": null,
                        "fieldValue": null
                    }]
                },
                "veh_sGaragingZip": {
                    "isArray": true,
                    "data": [{
                        "fieldName": null,
                        "fieldValue": null
                    }]
                },
                "veh_bLossPayee": {
                    "isArray": true,
                    "data": [{
                        "fieldName": null,
                        "fieldValue": null
                    }]
                },
                "veh_bAdditionalInterest": {
                    "isArray": true,
                    "data": [{
                        "fieldName": null,
                        "fieldValue": null
                    }]
                },
                "veh_sLossPayeeName": {
                    "isArray": true,
                    "data": [{
                        "fieldName": null,
                        "fieldValue": null
                    }]
                },
                "veh_sLossPayeeAddress": {
                    "isArray": true,
                    "data": [{
                        "fieldName": null,
                        "fieldValue": null
                    }]
                },
                "veh_sLossPayeeAddr2": {
                    "isArray": true,
                    "data": [{
                        "fieldName": null,
                        "fieldValue": null
                    }]
                },
                "veh_sLossPayeeCity": {
                    "isArray": true,
                    "data": [{
                        "fieldName": null,
                        "fieldValue": null
                    }]
                },
                "veh_sLossPayeeState": {
                    "isArray": true,
                    "data": [{
                        "fieldName": null,
                        "fieldValue": null
                    }]
                },
                "veh_sLossPayeeZip": {
                    "isArray": true,
                    "data": [{
                        "fieldName": null,
                        "fieldValue": null
                    }]
                },
                "prm_sClass": {
                    "isArray": true,
                    "data": [{
                        "fieldName": null,
                        "fieldValue": null
                    }]
                },
                "prm_dBi": {
                    "isArray": true,
                    "data": [{
                        "fieldName": null,
                        "fieldValue": null
                    }]
                },
                "prm_dPd": {
                    "isArray": true,
                    "data": [{
                        "fieldName": null,
                        "fieldValue": null
                    }]
                },
                "prm_dUmBi": {
                    "isArray": true,
                    "data": [{
                        "fieldName": null,
                        "fieldValue": null
                    }]
                },
                "prm_dUmPd": {
                    "isArray": true,
                    "data": [{
                        "fieldName": null,
                        "fieldValue": null
                    }]
                },
                "prm_dUimBi": {
                    "isArray": true,
                    "data": [{
                        "fieldName": null,
                        "fieldValue": null
                    }]
                },
                "prm_dUimPd": {
                    "isArray": true,
                    "data": [{
                        "fieldName": null,
                        "fieldValue": null
                    }]
                },
                "prm_dMedical": {
                    "isArray": true,
                    "data": [{
                        "fieldName": null,
                        "fieldValue": null
                    }]
                },
                "prm_dPip": {
                    "isArray": true,
                    "data": [{
                        "fieldName": null,
                        "fieldValue": null
                    }]
                },
                "prm_dAddOnEquip": {
                    "isArray": true,
                    "data": [{
                        "fieldName": null,
                        "fieldValue": null
                    }]
                },
                "prm_dCarLoanProtection": {
                    "isArray": true,
                    "data": [{
                        "fieldName": null,
                        "fieldValue": null
                    }]
                },
                "prm_dLienholderDed": {
                    "isArray": true,
                    "data": [{
                        "fieldName": null,
                        "fieldValue": null
                    }]
                },
                "prm_dComp": {
                    "isArray": true,
                    "data": [{
                        "fieldName": null,
                        "fieldValue": null
                    }]
                },
                "prm_dColl": {
                    "isArray": true,
                    "data": [{
                        "fieldName": null,
                        "fieldValue": null
                    }]
                },
                "prm_dTowing": {
                    "isArray": true,
                    "data": [{
                        "fieldName": null,
                        "fieldValue": null
                    }]
                },
                "prm_dRentRemb": {
                    "isArray": true,
                    "data": [{
                        "fieldName": null,
                        "fieldValue": null
                    }]
                },
                "prm_dSubtotal": {
                    "isArray": true,
                    "data": [{
                        "fieldName": null,
                        "fieldValue": null
                    }]
                },
                "drv_sLastName": {
                    "isArray": true,
                    "data": [{
                        "fieldName": null,
                        "fieldValue": null
                    }]
                },
                "drv_sFirstName": {
                    "isArray": true,
                    "data": [{
                        "fieldName": null,
                        "fieldValue": null
                    }]
                },
                "drv_cInitial": {
                    "isArray": true,
                    "data": [{
                        "fieldName": null,
                        "fieldValue": null
                    }]
                },
                "drv_tBirthDate": {
                    "isArray": true,
                    "data": [{
                        "fieldName": null,
                        "fieldValue": null
                    }]
                },
                "drv_sEmployer": {
                    "isArray": true,
                    "data": [{
                        "fieldName": null,
                        "fieldValue": null
                    }]
                },
                "drv_nPoints": {
                    "isArray": true,
                    "data": [{
                        "fieldName": null,
                        "fieldValue": null
                    }]
                },
                "drv_sLicensingState": {
                    "isArray": true,
                    "data": [{
                        "fieldName": null,
                        "fieldValue": null
                    }]
                },
                "drv_sLicenseNum": {
                    "isArray": true,
                    "data": [{
                        "fieldName": null,
                        "fieldValue": null
                    }]
                },
                "drv_bExcluded": {
                    "isArray": true,
                    "data": [{
                        "fieldName": null,
                        "fieldValue": null
                    }]
                },
                "drv_bPrincipleOperator": {
                    "isArray": true,
                    "data": [{
                        "fieldName": null,
                        "fieldValue": null
                    }]
                },
                "drv_bOnlyOperator": {
                    "isArray": true,
                    "data": [{
                        "fieldName": null,
                        "fieldValue": null
                    }]
                },
                "drv_bNonDriver": {
                    "isArray": true,
                    "data": [{
                        "fieldName": null,
                        "fieldValue": null
                    }]
                },
                "drv_sDriversOccupation": {
                    "isArray": true,
                    "data": [{
                        "fieldName": null,
                        "fieldValue": null
                    }]
                },
                "drv_sSex": {
                    "isArray": true,
                    "data": [{
                        "fieldName": null,
                        "fieldValue": null
                    }]
                },
                "drv_sMaritalStatus": {
                    "isArray": true,
                    "data": [{
                        "fieldName": null,
                        "fieldValue": null
                    }]
                },
                "drv_bFiling": {
                    "isArray": true,
                    "data": [{
                        "fieldName": null,
                        "fieldValue": null
                    }]
                },
                "drv_sFilingState": {
                    "isArray": true,
                    "data": [{
                        "fieldName": null,
                        "fieldValue": null
                    }]
                },
                "drv_sFilingReason": {
                    "isArray": true,
                    "data": [{
                        "fieldName": null,
                        "fieldValue": null
                    }]
                },
                "drv_tDateLicensed": {
                    "isArray": true,
                    "data": [{
                        "fieldName": null,
                        "fieldValue": null
                    }]
                },
                "drv_tHiredDate": {
                    "isArray": true,
                    "data": [{
                        "fieldName": null,
                        "fieldValue": null
                    }]
                },
                "drv_tDateOfCDL": {
                    "isArray": true,
                    "data": [{
                        "fieldName": null,
                        "fieldValue": null
                    }]
                },
                "drv_bGoodStudent": {
                    "isArray": true,
                    "data": [{
                        "fieldName": null,
                        "fieldValue": null
                    }]
                },
                "drv_bDriverTraining": {
                    "isArray": true,
                    "data": [{
                        "fieldName": null,
                        "fieldValue": null
                    }]
                },
                "drv_bDefDrvr": {
                    "isArray": true,
                    "data": [{
                        "fieldName": null,
                        "fieldValue": null
                    }]
                },
                "drv_sSSNum": {
                    "isArray": true,
                    "data": [{
                        "fieldName": null,
                        "fieldValue": null
                    }]
                },
                "drv_sRelationship": {
                    "fieldName": null,
                    "fieldValue": null
                }
            }
        };
        service.raters[rater.quote_type] = rater;
        service.raters[rater1.quote_type] = rater1;
        service.raters[rater2.quote_type] = rater2;
        return service.raters;
    };

    return service;
});
