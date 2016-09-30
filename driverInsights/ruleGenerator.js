/**
 * Copyright 2016 IBM Corp. All Rights Reserved.
 *
 *
 * Data Privacy Disclaimer
 * 
 * This Program has been developed for demonstration purposes only to illustrate the technical
 * capabilities and potential business uses of the IBM IoT for Automotive
 * 
 * The components included in this Program may involve the processing of personal information
 * (for example location tracking and behavior analytics). When implemented in practice such
 * processing may be subject to specific legal and regulatory requirements imposed by country
 * specific data protection and privacy laws. Any such requirements are not addressed in
 * this Program.
 * 
 * Licensee is responsible for the ensuring Licensee's use of this Program and any deployed
 * solution meets applicable legal and regulatory requirements. This may require the implementation
 * of additional features and functions not included in the Program.
 * 
 * Apple License issue
 * 
 * This Program is intended solely for use with an Apple iOS product and intended to be used
 * in conjunction with officially licensed Apple development tools and further customized
 * and distributed under the terms and conditions of Licensee's licensed Apple iOS Developer
 * Program or Licensee's licensed Apple iOS Enterprise Program.
 * 
 * Licensee agrees to use the Program to customize and build the application for Licensee's own
 * purpose and distribute in accordance with the terms of Licensee's Apple developer program
 * 
 * Risk Mitigation / Product Liability Issues
 * 
 * The Program and any resulting application is not intended for design, construction, control,
 * or maintenance of automotive control systems where failure of such sample code or resulting
 * application could give rise to a material threat of death or serious personal injury.
 * 
 * IBM shall have no responsibility regarding the Program's or resulting application's compliance
 * with laws and regulations applicable to Licensee's business and content. Licensee is responsible
 * for use of the Program and any resulting application.
 * 
 * As with any development process, Licensee is responsible for developing, sufficiently testing
 * and remediating Licensee's products and applications and Licensee is solely responsible for any
 * foreseen or unforeseen consequences or failures of Licensee's products or applications.
 * 
 * REDISTRIBUTABLES
 * 
 * If the Program includes components that are Redistributable, they will be identified 
 * in the REDIST file that accompanies the Program. In addition to the license rights granted
 * in the Agreement, Licensee may distribute the Redistributables subject to the following terms:
 * 
 * 1) Redistribution must be in source code form only and must conform to all directions,
 *    instruction and specifications in the Program's accompanying REDIST or documentation;
 * 2) If the Program's accompanying documentation expressly allows Licensee to modify
 *    the Redistributables, such modification must conform to all directions, instruction and
 *    specifications in that documentation and these modifications, if any, must be treated
 *    as Redistributables;
 * 3) Redistributables may be distributed only as part of Licensee's application that was developed
 *    using the Program ("Licensee's Application") and only to support Licensee's customers
 *    in connection with their use of Licensee's Application. Licensee's application must constitute
 *    significant value add such that the Redistributables are not a substantial motivation
 *    for the acquisition by end users of Licensee's software product;
 * 4) If the Redistributables include a Java Runtime Environment, Licensee must also include other
 *    non-Java Redistributables with Licensee's Application, unless the Application is designed to
 *    run only on general computer devices (e.g., laptops, desktops and servers) and not on handheld
 *    or other pervasive devices (i.e., devices that contain a microprocessor but do not have
 *    computing as their primary purpose);
 * 5) Licensee may not remove any copyright or notice files contained in the Redistributables;
 * 6) Licensee must hold IBM, its suppliers or distributors harmless from and against any claim
 *    arising out of the use or distribution of Licensee's Application;
 * 7) Licensee may not use the same path name as the original Redistributable files/modules;
 * 8) Licensee may not use IBM's, its suppliers or distributors names or trademarks in connection
 *    with the marketing of Licensee's Application without IBM's or that supplier's
 *    or distributor's prior written consent;
 * 9) IBM, its suppliers and distributors provide the Redistributables and related documentation
 *    without obligation of support and "AS IS", WITH NO WARRANTY OF ANY KIND, EITHER EXPRESS
 *    OR IMPLIED, INCLUDING THE WARRANTY OF TITLE, NON-INFRINGEMENT OR NON-INTERFERENCE AND THE
 *    IMPLIED WARRANTIES AND CONDITIONS OF MERCHANTABILITY AND FITNESS FOR A PARTICULAR PURPOSE.;
 * 10) Licensee is responsible for all technical assistance for Licensee's Application and any
 *     modifications to the Redistributables; and
 * 11) Licensee's license agreement with the end user of Licensee's Application must notify the end
 *     user that the Redistributables or their modifications may not be i) used for any purpose
 *     other than to enable Licensee's Application, ii) copied (except for backup purposes),
 *     iii) further distributed or transferred without Licensee's Application or 
 *     iv) reverse assembled, reverse compiled, or otherwise translated except as specifically
 *     permitted by law and without the possibility of a contractual waiver. Furthermore, Licensee's
 *     license agreement must be at least as protective of IBM as the terms of this Agreement.
 * 
 * Feedback License
 * 
 * In the event Licensee provides feedback to IBM regarding the Program, Licensee agrees to assign
 * to IBM all right, title, and interest (including ownership of copyright) in any data, suggestions,
 * or written materials that 1) are related to the Program and 2) that Licensee provides to IBM.
 */
var ruleGenerator = module.exports = {};

var _ = require("underscore");
var debug = require('debug')('rule');
debug.log = console.log.bind(console);

var XML_GENERAL_SECTION = "<RuleType>{rule_id}</RuleType>" +
						  	"<RuleID>{rule_type}</RuleID>" +
							"<Name>{name}</Name>" +
							"<Description>{description}</Description>";

/*
 * ruleEngine is an exported module
 */
_.extend(ruleGenerator, {

	createEventIdentifierRuleXML: function(json) {
		return this.createRuleXML("EventIdentifierRule", json);
	},

	createVehicleAcitonRuleXML: function(json) {
		return this.createRuleXML("VehicleActionRule", json);
	},
	
	createRuleXML: function(ruleName, json) {
		var xml = "<" + ruleName + ">";
		xml += this.createGeneralSectionXML(json);
		if (json.target) {
			xml += this.createTargetSectionXML(json.target);
		}
		if (json.condition) {
			xml += this.createConditionSectionXML(json.condition);
		}
		if (json.events) {
			xml += this.createEventsSectionXML(json.events);
		}
		if (json.actions) {
			xml += this.createActionSectionXML(json.actions);
		}
		xml += "</" + ruleName + ">";
		return xml;
	},

	/*
	 * General
	 */
	createGeneralSectionXML: function(json) {
		return XML_GENERAL_SECTION.replace('{rule_id}', json.rule_id||'')
							.replace('{rule_type}', json.rule_type||'')
							.replace('{name}', json.name||'')
							.replace('{description}', json.description||'');
	},
	
	createTargetSectionXML: function(json) {
		var self = this;
		var xml = "<Target>";
		if (json.areas) {
			json.areas.forEach(function(area) {
				xml += self.createTargetAreaSectionXML(area);
			});
		}
		if (json.vehicles) {
			json.vehicles.forEach(function(vehicle) {
				xml += this.createTargetVehicleSectionXML(vehicle);
			});
		}
		if (json.drivers) {
			json.drivers.forEach(function(driver) {
				xml += this.createTargetDriverSectionXML(driver);
			});
		}
		xml += "</Target>";
		return xml;
	},
	/*
	 * Target
	 */
	createTargetAreaSectionXML: function(json) {
		var xml = "<Area>";
		for (var key in json) {
			xml += this._createSimpleXMLNode(key, json[key]);
		}
		xml += "</Area>";
		return xml;
	},
	createTargetVehicleSectionXML: function(json) {
		var xml = "<Vehicle>";
		if (json.types) {
			xml += "<VehicleType>";
			json.vehicle_types.forEach(function(type, index) {
				if (index > 0)
					xml += ",";
				xml += type;
			});
			xml += "</VehicleType>";
		}
		if (json.models) {
			xml += "<VehicleModel>";
			json.vehicle_models.forEach(function(model, index) {
				if (index > 0)
					xml += ",";
				xml += model;
			});
			xml += "</VehicleModel>";
		}

		xml += this._createSimpleXMLNode("VehicleSerialNumber", json.serial_number || "");

		xml += "<VehicleSerialNumber>" + (json.serial_number || "") + "</VehicleSerialNumber>";
		if (json.min_width > 0) {
			xml += this._createSimpleXMLNode("MinVehicleWidth", json.min_width);
		}
		if (json.max_width > 0) {
			xml += this._createSimpleXMLNode("MaxVehicleWidth", json.max_width);
		}
		if (json.min_height > 0) {
			xml += this._createSimpleXMLNode("MinVehicleHeight", json.min_height);
		}
		if (json.max_height > 0) {
			xml += this._createSimpleXMLNode("MaxVehicleHeight", json.max_height);
		}
		xml += "</Vehicle>";
		return xml;
	},
	createTargetDriverSectionXML: function(json) {
		var xml = "<Driver>";
		if (json.min_age > 0) {
			xml += this._createSimpleXMLNode("MinDriverAge", json.min_age);
		}
		if (json.max_age > 0) {
			xml += this._createSimpleXMLNode("MaxDriverAge", json.max_age);
		}
		if (json.license_types) {
			xml += "<LicenseType>";
			json.license_types.forEach(function(type, index) {
				if (index > 0)
					xml += ",";
				xml += type;
			});
			xml += "</LicenseType>";
		}
		if (json.properties) {
			json.properties.forEach(function(prop, index) {
				xml += this._createSimpleXMLNodeWithTagName("Property", prop);
			});
		}
		xml += "</Driver>";
		return xml;
	},
	
	/*
	 * Condition
	 */
	createConditionSectionXML: function(json) {
		var xml = "<Condition pattern=\"" + json.pattern + "\">";
		if (!isNaN(json.count)) {
			xml += this._createSimpleXMLNode("Count", conditionJson.count);
		}
		if (json.value_condition) {
			xml += this._createSimpleXMLNodeWithTagName("ValueCondition", json.value_condition);
		}
		if (json.time_condition) {
			xml += this._createSimpleXMLNode("TimeCondition", json.time_condition.time);
		}
		if (json.location_condition) {
			xml += this.createLocationConditionSectionXML(json.location_condition);
		}
		xml += "</Condition>";
		return xml;
	},
	createLocationConditionSectionXML: function(json) {
		if (json.range) {
			xml = "<LocationCondition range=\"" + json.range + "\">";
		} else {
			xml = "<LocationCondition>";
		}
		for (var key in json) {
			if (key !== "range") {
				xml += this._createSimpleXMLNode(key, json[key]);
			}
		}
		xml += "</LocationCondition>";
		return xml;
	},

	/*
	 * Event
	 */
	createEventsSectionXML: function(json) {
		var xml = "<Events>";
		if (json.events) {
			var self = this;
			json.events.forEach(function(event) {
				xml += "<Event>";
				for (var key in event) {
					xml += self._createSimpleXMLNode(key, event[key]);
				}
				xml += "</Event>";
			});
		}
		xml += "</Events>";
		return xml;
	},
	
	/*
	 * Action
	 */
	createActionSectionXML: function(json) {
		var self = this;
		var xml = "<Action>";
		if (json.vehicle_actions) {
			json.vehicle_actions.forEach(function(action) {
				xml += self.createVehicleActionSectionXML(action);
			});
		}
		xml += "</Action>";
		return xml;
	},
	createVehicleActionSectionXML: function(json) {
		var xml = "<VehicleAction>";
		if (json.message) {
			xml += this._createSimpleXMLNode("Message", json.message);
		}
		if (json.parameters) {
			var self = this;
			json.parameters.forEach(function(parameter) {
				xml += self._createSimpleXMLNodeWithTagName("Parameter", parameter);
			});
		}
		xml += "</VehicleAction>";
		return xml;
	},
	
	_createSimpleXMLNode: function(key, value) {
		var keys = key.split('_');
		var nodeName = "";
		keys.forEach(function(k) {
			if (k.length > 0) {
				nodeName += k.charAt(0).toUpperCase() + k.slice(1);
			}
		});
		return "<" + nodeName + ">" + value + "</" + nodeName + ">";
	},
	_createSimpleXMLNodeWithTagName: function(tag, json) {
		var xml = "";
		for (var key in json) {
			xml += this._createSimpleXMLNode(key, json[key]);
		}
		return this._createSimpleXMLNode(tag, xml);
	}
});