/************************************************************************
 * Licensed Materials - Property of IBM
 *
 * (C) Copyright IBM Corp. 2017  All Rights Reserved.
 *
 * US Government Users Restricted Rights - Use, duplication or 
 * disclosure restricted by GSA ADP Schedule Contract with IBM Corp.
 ************************************************************************/
package com.ibm.mobility.sample.payload;

import java.util.Collections;
import java.util.List;
import java.util.Map;

import com.ibm.mobility.autodrive.parameter.IDataParameters;
import com.ibm.mobility.util.MobilityConfig;

/**
 * Abstract class for loading key/value pair payload
 *
 */
abstract class KeyValuePayload extends Payload {
	private final Map<String, String[]> params;
	
	KeyValuePayload(final MobilityConfig config, final String myname, final String payloadStr, final String cmd) {
		super(config, myname, cmd);
		this.params = createParams(payloadStr, cmd);
	}

	/**
	 * Create params from payload
	 * @param payloadStr payload string
	 * @param cmd command
	 * @return key and value map
	 */
	protected abstract Map<String, String[]> createParams(final String payloadStr, final String cmd);
	
	@Override
	public boolean loadParameters(final IDataParameters parameters) {
		Map<String, List<String>> headers = Collections.emptyMap();
		return parameters.getParameters(headers, params, mapping_list);
	}
}
