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
import java.util.ArrayList;
import java.util.Collections;
import java.util.HashMap;
import java.util.List;
import java.util.Map;

import org.codehaus.jackson.JsonFactory;
import org.codehaus.jackson.JsonParseException;
import org.codehaus.jackson.JsonParser;
import org.codehaus.jackson.JsonToken;

import com.ibm.mobility.util.MobilityConfig;
import com.ibm.mobility.util.MobilityLogger;

/**
 * JSON format data
 */
class JSONPayload extends KeyValuePayload {
	// Set <logging traceSpecification="*=audit:com.ibm.mobility.sample.*=config" /> in server.xml to output debug log
	private MobilityLogger logger = MobilityLogger.getLogger(JSONPayload.class.getName());
	
	JSONPayload(final MobilityConfig config, final String myname, final String payloadStr, final String cmd) {
		super(config, myname, payloadStr, cmd);
	}
	
	@Override
	protected Map<String, String[]> createParams(final String payloadStr, final String cmd) {
		Map<String, List<String>> map = new HashMap<>();
		
		JsonFactory factory = new JsonFactory();	
	    try {
	        JsonParser parser = factory.createJsonParser(payloadStr);
	        JsonToken current = parser.nextToken();
	        if (current != JsonToken.START_OBJECT) {
	            return Collections.emptyMap();
	        }
	        parseJson(parser, null, map);
	        
//        	System.out.println("==== JSON ====");
	        Map<String, String[]> retMap = new HashMap<>();
	        for (String key : map.keySet()) {
	        	List<String> values =  map.get(key);
//	        	System.out.println(key + "=" + values.get(0));
	        	retMap.put(key, values.toArray(new String[values.size()]));
	        }
//        	System.out.println("==== End of JSON ====");
	        
	        return retMap;
	    } catch (IOException e) {
	    	logger.error("Error when parsing JSON payload", e);
	    }
        return Collections.emptyMap();
	}

	private void parseJson(final JsonParser parser, final String name, final Map<String, List<String>> map) throws JsonParseException, IOException {
		if (name != null && !"d".equals(name) && !"props".equals(name) && !"status".equals(name)) {
			return;
		}
		while (parser.nextToken() != JsonToken.END_OBJECT) {
            String fieldName = parser.getCurrentName();
            JsonToken token = parser.nextToken();
            if (token == JsonToken.START_OBJECT) {
            		parseJson(parser, fieldName, map);
            } else {
	        		if ("props".equals(name)) {
	        			fieldName = "prop_" + fieldName;
	        		} else if ("status".equals(name)) {
	        			fieldName = "status_" + fieldName;
	        		}
                List<String> values = map.get(fieldName);
                if (values == null) {
                		values = new ArrayList<>();
                		map.put(fieldName, values);
                }
            		values.add(parser.getText());
            }
        }
	}
}
