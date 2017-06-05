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

import com.ibm.mobility.autodrive.object.util.Mapping;
import com.ibm.mobility.autodrive.parameter.IDataParameters;
import com.ibm.mobility.autodrive.process.IProbeDataProcess;
import com.ibm.mobility.util.MobilityConfig;

/**
 * Abstract class to contains a MQTT payload
 *
 */
public abstract class Payload {
	private final MobilityConfig config;
	private final String myname;
	private final String cmd;
	protected final HashMap<String, Mapping> mapping_list;
	
	Payload(final MobilityConfig config, final String myname, final String cmd) {
		this.config = config;
		this.myname = myname;
		this.cmd = cmd;
		this.mapping_list = isPositionFormat() ? config.getPos_mapping_list() : config.getMapping_list();
	}
	
	protected boolean isPositionFormat() {
		return false;
	}
	/**
	 * Get mapping for this payload
	 * 
	 * @param config
	 * @return
	 */
	protected Mapping getMapping() {
		return mapping_list.get(getCmd());
	}
	
	/**
	 * Command name of this payload
	 * <ul>
	 * <li>SEND_CAR_PROBE
	 * <li>SEND_EVENT
	 * <li>QUERY_EVENT
	 * </ul>
	 * @return return command
	 */
	public String getCmd() {
		return cmd;
	}

	/**
	 * Get {@link IProbeDataProcess} to be used as a process
	 * 
	 * @return {@link IProbeDataProcess}
	 */
	public IProbeDataProcess getProbeDataProcess() {
		Mapping mapping = mapping_list.get(getCmd());
		IProbeDataProcess process = mapping.getP_process();
		if (process == null) {
			System.out.println("no process defined for " + getCmd() + ", message ignored");
		} else {
			if (!(process.isInitialized())) {
				process.init(config, myname);
			}
		}
		return process;
	}
	
	/**
	 * Check if this payload contains the end message
	 * @return
	 */
	public boolean isEnd() {
		return false;
	}

	/**
	 * Normalize parameters
	 * 
	 * @param parameters implementation of {@link IDataParameters} 
	 * @return
	 */
	public abstract boolean loadParameters(final IDataParameters parameters);
}
