/************************************************************************
 * Licensed Materials - Property of IBM
 *
 * (C) Copyright IBM Corp. 2017  All Rights Reserved.
 *
 * US Government Users Restricted Rights - Use, duplication or 
 * disclosure restricted by GSA ADP Schedule Contract with IBM Corp.
 ************************************************************************/
package com.ibm.mobility.sample.payload;

import java.io.IOException;

import org.codehaus.jackson.JsonFactory;
import org.codehaus.jackson.JsonParser;
import org.codehaus.jackson.JsonToken;

import com.ibm.mobility.util.MobilityConfig;
import com.ibm.mobility.util.MobilityLogger;

/**
 * CSV format data enclosed by JSON
 */
class MQTTCSVPayload extends CSVPayload {
	// Set <logging traceSpecification="*=audit:com.ibm.mobility.sample.*=config" /> in server.xml to output debug log
	private static MobilityLogger logger = MobilityLogger.getLogger(MQTTCSVPayload.class.getName());

	MQTTCSVPayload(final MobilityConfig config, final String myname, final String payloadStr, final String cmd) {
		super(config, myname, extractCSV(payloadStr), cmd);
	}
	
	private static String extractCSV(String payloadStr) {
		JsonFactory factory = new JsonFactory();	
	    try {
	        JsonParser parser = factory.createJsonParser(payloadStr);
	        JsonToken current = parser.nextToken();
	        if (current != JsonToken.START_OBJECT) {
	            return payloadStr;
	        }
	        current = parser.nextToken();
	        if (!"d".equals(parser.getCurrentName())) {
	            return payloadStr;
	        }
	        parser.nextToken();
	        return parser.getText();
	    } catch (IOException e) {
	    	logger.error("Error when parsing JSON payload", e);
	    }
	    return payloadStr;
	}
}

