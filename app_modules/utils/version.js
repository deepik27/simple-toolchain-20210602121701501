/**
 * Copyright 2017,2019 IBM Corp. All Rights Reserved.
 *
 * Licensed under the IBM License, a copy of which may be obtained at:
 *
 * https://github.com/ibm-watson-iot/iota-starter-server-fm-saas/blob/master/LICENSE
 *
 * You may not use this file except in compliance with the license.
 */
class Version {
	constructor() {
		this.version = (function () {
			var userVcapSvc = JSON.parse(process.env.USER_PROVIDED_VCAP_SERVICES || '{}');
			var vcapSvc = userVcapSvc.iotforautomotive || VCAP_SERVICES.iotforautomotive;
			if (vcapSvc && vcapSvc.length > 0) {
				var cred = vcapSvc[0].credentials;
				return cred.version;
			}
		})();
	}

	/**
	 *
	 * @param {*} version1
	 * @param {*} version2
	 */
	compare(version1, version2) {
		const addZero = function (v, digit) {
			for (let i = v.length; i < digit; i++) {
				v.push("0");
			}
			return v;
		}
		let v1 = (version1 || "").split(".");
		let v2 = (version2 || "").split(".");
		const digit = Math.max(v1.length, v2.length);
		v1 = addZero(v1, digit);
		v2 = addZero(v2, digit);
		for (let index = 0; index < digit; index++) {
			const num1 = Number(v1[index]);
			const num2 = Number(v2[index]);
			if (isNaN(num1)) {
				throw new Error("Invalid version number: " + version1);
			} else if (isNaN(num2)) {
				throw new Error("Invalid version number: " + version2);
			} else if (num1 > num2) {
				return 1;
			} else if (num1 < num2) {
				return -1;
			}
		}
		return 0;
	}

	laterOrEqual(version) {
		let laterOrEqual;
		if (this.version === undefined) {
			// Version is not specified. Run as latest
			return true;
		}
		try {
			laterOrEqual = this.compare(this.version, version) >= 0;
		} catch (err) {
			// Run as latest
			console.warn(err.message + " - Run as latest version");
			laterOrEqual = true;
		}
		return laterOrEqual;
	}
};

module.exports = new Version();
