/************************************************************************
 * Licensed Materials - Property of IBM
 *
 * (C) Copyright IBM Corp. 2017  All Rights Reserved.
 *
 * US Government Users Restricted Rights - Use, duplication or 
 * disclosure restricted by GSA ADP Schedule Contract with IBM Corp.
 ************************************************************************/
package com.ibm.mobility.sample.payload;

import java.util.HashMap;

import com.ibm.mobility.autodrive.adapter.Adapter;
import com.ibm.mobility.autodrive.object.util.Mapping;
import com.ibm.mobility.autodrive.parameter.IDataParameters;
import com.ibm.mobility.util.MobilityConfig;

/**
 * CSV format data
 */
class CSVPayload extends Payload {
	private final String[] data;
	private final boolean isEnd;

	CSVPayload(final MobilityConfig config, final String myname, final String payloadStr, final String cmd) {
		super(config, myname, cmd);
		
		data = payloadStr.split(",");
		isEnd = payloadStr.startsWith(Adapter.ADAPTER_CMD_END);
	}

	@Override
	protected boolean isPositionFormat() {
		return true;
	}
	
	@Override
	public String getCmd() {
		return data[0];
	}

	@Override
	public boolean isEnd() {
		return isEnd;
	}

	@Override
	public boolean loadParameters(final IDataParameters parameters) {
		Mapping mapping = getMapping();
		HashMap<String, String> list = (mapping != null) ? mapping.getList() : null;
		return parameters.getPosParameters(data, list);
	}
}
