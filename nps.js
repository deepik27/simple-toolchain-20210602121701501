/**
 * Copyright 2017 IBM Corp. All Rights Reserved.
 *
 * Licensed under the IBM License, a copy of which may be obtained at:
 *
 * http://www14.software.ibm.com/cgi-bin/weblap/lap.pl?li_formnum=L-DDIN-AHKPKY&popup=n&title=IBM%20IoT%20for%20Automotive%20Sample%20Starter%20Apps%20%28Android-Mobile%20and%20Server-all%29
 *
 * You may not use this file except in compliance with the license.
 */
const router = module.exports = require('express').Router();

USER_PROVIDED_VCAP_SERVICES = JSON.parse(process.env.USER_PROVIDED_VCAP_SERVICES || '{}');

router.get("/nps", function (req, res) {
	const npsVar = getNPSVariables();
	res.send(npsVar);
});

const getNPSVariables = function () {
	// NPS
	const iotaCreds = USER_PROVIDED_VCAP_SERVICES.iotforautomotive || VCAP_SERVICES.iotforautomotive;
	let accountId = (function () {
		if (iotaCreds && iotaCreds.length > 0 && iotaCreds[0].credentials) {
			const credentials = iotaCreds[0].credentials;
			const vdh = (credentials.vehicle_data_hub && credentials.vehicle_data_hub.length > 0 && credentials.vehicle_data_hub[0]);
			if (vdh) {
				return vdh.split(".")[0] || "none";
			} else {
				// api should be starts with "https://"
				return credentials.api.substring("https://".length, credentials.api.indexOf("."));
			}
		}
		return "none";
	})();

	let IBM_Meta = {
		"offeringId": "5737-B44",
		"highLevelOfferingName": "Watson IoT",
		"offeringName": "IoT for Auto",
		"language": "en",
		"otherAccountId": accountId,
		"otherAccountIdType": "IoT4A Tenant ID",
		"daysSinceFirstLogin": 31,
		"quarterlyIntercept": "heavy",
		"trigger1": false
	};

	if (process.env.NPS_TEST) {
		IBM_Meta.noQuarantine = "yes";
		IBM_Meta.testData = true;
	}

	return IBM_Meta;
}
