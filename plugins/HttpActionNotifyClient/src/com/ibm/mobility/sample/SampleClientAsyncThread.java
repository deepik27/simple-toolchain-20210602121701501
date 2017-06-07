/************************************************************************
 * Licensed Materials - Property of IBM
 *
 * (C) Copyright IBM Corp. 2017  All Rights Reserved.
 *
 * US Government Users Restricted Rights - Use, duplication or 
 * disclosure restricted by GSA ADP Schedule Contract with IBM Corp.
 ************************************************************************/
package com.ibm.mobility.sample;

import java.text.SimpleDateFormat;
import java.util.Calendar;

import com.ibm.mobility.autodrive.parameter.CarProbeParameters;
import com.ibm.mobility.autodrive.parameter.QueryEventParameters;
import com.ibm.mobility.autodrive.parameter.IDataParameters;
import com.ibm.mobility.autodrive.parameter.Parameter;
import com.ibm.mobility.autodrive.parameter.SendEventParameters;
import com.ibm.mobility.autodrive.process.IProbeDataProcess;

public class SampleClientAsyncThread implements Runnable {
	private IDataParameters para = null;
	private SimpleDateFormat sdf = new SimpleDateFormat("yyyy-MM-dd hh:mm:ss.SSS");
	private IProbeDataProcess p = null;

	/**
	 * 
	 * @param args
	 */
	public SampleClientAsyncThread(IDataParameters para, IProbeDataProcess p) {
		this.para = para;
		this.p = p;
	}

	public void run() {
		// Start Receiving
		try {
			// Process Here
			if (para.getCmd().equalsIgnoreCase(Parameter.CMD_SEND_EVENT)) {
				// Event Receive
				System.out.println("Start Receive:" + sdf.format(Calendar.getInstance().getTime()));
				// Set required parameters from CSV by using map list
				// Process Event
				p.processEvent((SendEventParameters) para);
			} else if (para.getCmd().equalsIgnoreCase(Parameter.CMD_SEND_CARPROBE)) {
				// Car Probe
				p.processCarProbe((CarProbeParameters) para);
			} else if (para.getCmd().equalsIgnoreCase(Parameter.CMD_GET_EVENT)) {
				// Basically, Event Query should be SYNC
				// Process Event Query
				p.processEventQuery((QueryEventParameters) para);
			}
		} catch (Exception e) {
			e.printStackTrace();
		}
	}
}
