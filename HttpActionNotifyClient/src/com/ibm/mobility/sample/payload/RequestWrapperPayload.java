package com.ibm.mobility.sample.payload;

import com.ibm.mobility.autodrive.client.def.http.IRequestWrapper;
import com.ibm.mobility.autodrive.parameter.ActionParameters;
import com.ibm.mobility.autodrive.parameter.CarProbeParameters;
import com.ibm.mobility.autodrive.parameter.IDataParameters;
import com.ibm.mobility.autodrive.parameter.QueryEventParameters;
import com.ibm.mobility.autodrive.parameter.SendEventParameters;
import com.ibm.mobility.util.MobilityConfig;

public class RequestWrapperPayload extends Payload {
	private final IRequestWrapper request;

	public RequestWrapperPayload(MobilityConfig config, String myname, IRequestWrapper request, String cmd) {
		super(config, myname, cmd);
		this.request = request;
	}

	@Override
	public boolean loadParameters(IDataParameters parameters) {
		if(parameters instanceof ActionParameters){
			return request.loadParameters((ActionParameters)parameters, mapping_list);
		}else if(parameters instanceof CarProbeParameters){
			return request.loadParameters((CarProbeParameters)parameters, mapping_list);
		}else if(parameters instanceof QueryEventParameters){
			return request.loadParameters((QueryEventParameters)parameters, mapping_list);
		}else if(parameters instanceof SendEventParameters){
			return request.loadParameters((SendEventParameters)parameters, mapping_list);
		}
		return false;
	}
}
