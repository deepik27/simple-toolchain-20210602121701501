/************************************************************************
 * Licensed Materials - Property of IBM
 *
 * (C) Copyright IBM Corp. 2017  All Rights Reserved.
 *
 * US Government Users Restricted Rights - Use, duplication or 
 * disclosure restricted by GSA ADP Schedule Contract with IBM Corp.
 ************************************************************************/
package com.ibm.mobility.sample;

import java.io.IOException;
import java.text.SimpleDateFormat;
import java.util.Arrays;
import java.util.Calendar;
import java.util.Collection;
import java.util.concurrent.ExecutorService;
import java.util.concurrent.Executors;

import org.codehaus.jackson.map.ObjectMapper;

import com.ibm.mobility.autodrive.adapter.Adapter;
import com.ibm.mobility.autodrive.client.IClient;
import com.ibm.mobility.autodrive.client.util.DisplayActionContents;
import com.ibm.mobility.autodrive.client.util.ResultFormatter;
import com.ibm.mobility.autodrive.object.Action;
import com.ibm.mobility.autodrive.object.Event;
import com.ibm.mobility.autodrive.object.MessageNotification;
import com.ibm.mobility.autodrive.object.Tenant;
import com.ibm.mobility.autodrive.object.util.ActionContents;
import com.ibm.mobility.autodrive.parameter.CarProbeParameters;
import com.ibm.mobility.autodrive.parameter.IDataParameters;
import com.ibm.mobility.autodrive.parameter.Parameter;
import com.ibm.mobility.autodrive.parameter.QueryEventParameters;
import com.ibm.mobility.autodrive.parameter.SendEventParameters;
import com.ibm.mobility.autodrive.process.IProbeDataProcess;
import com.ibm.mobility.sample.payload.Payload;
import com.ibm.mobility.sample.payload.PayloadFactory;
import com.ibm.mobility.util.MobilityConfig;
import com.ibm.mobility.util.MobilityLogger;
import com.ibm.mobility.util.misc.ExecutorServiceUtil;

public class AbstractClient implements IClient {
	// Set <logging traceSpecification="*=audit:com.ibm.mobility.sample.*=config" /> in server.xml to output debug log
	private final MobilityLogger logger = MobilityLogger.getLogger(AbstractClient.class.getName());

	/**
	 * boolean value to indicate if response is pushed back or not
	 */
	private static final String PROP_PUSH = "push";
	/**
	 * number of threads to handle messages. the default value is 1.
	 */
	private static final String PROP_THREADSIZE = "threadsize"; 
	/**
	 * default tenant id. the default value is "public".
	 */
	private static final String PROP_DEFTENANTID = "default_tenant"; 
	/**
	 * payload format. csv, json etc
	 */
	private static final String PROP_PAYLOAD_FORMAT = "payloadFormant"; 
	
	private static final String RET_NO_ERROR = "<retcode>0</retcode>";
	private static SimpleDateFormat sdf = new SimpleDateFormat("yyyy-MM-dd hh:mm:ss.SSS");
	private static ResultFormatter rf = new ResultFormatter(); 
	private static ObjectMapper  mapper = new ObjectMapper();

	private String myname;
	private PropertyLoader propLoader;
	private MobilityConfig config;
	private boolean isPushClient = false;
	private int threadsize = 1;
	private String def_tenant = "public";
	private long def_n_tenant = 0;
	private ExecutorService executorService;
	private boolean isHttp;
	private String userAgent;
	private String payloadFormat = "json";
	
	@Override
	public void init(final MobilityConfig config, final String myname) {
		this.config = config;
		this.myname = myname;
		propLoader = new PropertyLoader(config, getClientName());

		isPushClient = propLoader.getBooleanPropertyValue(PROP_PUSH, isPushClient);
		threadsize = propLoader.getIntPropertyValue(PROP_THREADSIZE, threadsize);
		def_tenant = propLoader.getPropertyValue(PROP_DEFTENANTID, def_tenant);
		if (config.getTenant_list() != null) {
			Tenant t = config.getTenant_list().get(def_tenant);
			if (t == null) {
				logger.error(String.format("Tenant : %s is not defined", def_tenant));
			} else {
				def_n_tenant = t.getN_tenant_id();
			}
		}
		payloadFormat = propLoader.getPropertyValue(PROP_PAYLOAD_FORMAT, payloadFormat);
	}
	
	@Override
	public void terminate() {
		synchronized (this) {
			if (executorService != null) {
				ExecutorServiceUtil.shutdown(executorService);
				executorService = null;
			}
		}
	}

	protected PropertyLoader getPropertyLoader() {
		return propLoader;
	}
	
	@Override
	public Object call(Object o) {
		return call(o, null);
	}

	@Override
	public Object call(Object o, Object e_o) {
		return null;
	}

	@Override
	public Object multiCall(Object arg0, Object arg1) {
		return null;
	}

	@Override
	public boolean isPushClient() {
		return isPushClient;
	}

	@Override
	public int push(Action arg0) {
		throw new UnsupportedOperationException();
	}

	@Override
	public boolean isHttp() {
		return isHttp;
	}

	@Override
	public void setHttp(boolean isHttp) {
		this.isHttp = isHttp;
	}

	@Override
	public boolean isRequired(String userAgent) {
		return userAgent != null && userAgent.equals(this.userAgent);
	}

	@Override
	public void setUserAgent(String userAgent) {
		this.userAgent = userAgent;
	}
	
	/**
	 * Create an executor to handle request
	 * 
	 * @param props properties in gateway.properties
	 * 
	 * @return {@link ExecutorService}
	 */
	protected synchronized ExecutorService getExecutorService() {
		if (executorService == null) {
			executorService = Executors.newFixedThreadPool(threadsize);
		}
		return executorService;
	}
	
	/**
	 * Get this client name to access properties. By default, Property values are accessed using the key &lt;ClientName&gt;.&lt;PropertyKey&gt;. 
	 * 
	 * @return client name
	 */
	protected String getClientName() {
		return this.getClass().getSimpleName();
	}

	/**
	 * Create a payload object to be passed {@link #processPayload(Payload)}
	 * 
	 * @param data incoming data in String
	 * @param cmd cmd
	 * @return {@link Payload}
	 */
	protected Payload createPayload(final String data, final String cmd) {
		return PayloadFactory.getInstance().createPayload(payloadFormat, config, myname, data, cmd);
	}
	
	/**
	 * Process incoming data
	 * 
	 * @param payload
	 */
	protected ProcessResult processPayload(final Payload payload) {
		final String cmd = payload.getCmd();
		final IProbeDataProcess p = payload.getProbeDataProcess();
		if (p == null) {
			logger.warn(String.format("no process defined for %s, message ignored", cmd));
		}
		
		String retStr = null;
		if(Parameter.CMD_SEND_EVENT.equalsIgnoreCase(cmd)) {
			return processSendEvent(payload, p);
		} else if(Parameter.CMD_SEND_CARPROBE.equalsIgnoreCase(cmd)) {
			return processSendCarProbe(payload, p);
		} else if(Parameter.CMD_QUERY_EVENT.equalsIgnoreCase(cmd)) {
			return processQueryEvent(payload, p);
		} else if(payload.isEnd()) {
			// Notify End of File (Simulator)
			logger.debug("END Receive:" + sdf.format(Calendar.getInstance().getTime()));
			retStr = "<" + Adapter.ADAPTER_CMD_END + "/>\n";
		}
		// Log Response
		logger.debug("Return:" + retStr);
		return ProcessResult.buildErrorResult(retStr);
	}

	protected ProcessResult processQueryEvent(final Payload payload, final IProbeDataProcess p) {
		// Get Request Parameters 
		IDataParameters para = new QueryEventParameters(config.getMm(), def_n_tenant, def_tenant, config.getRm());
		if(payload.loadParameters(para)) {
			if(para.isAsync()) {
				// If Async, Thread is invoked from here
				executorService.execute(new SampleClientAsyncThread(para, p));
				return ProcessResult.buildNoneResult();
			} else {
				// Process Here
				Event[] events = (Event[]) p.processEventQuery((QueryEventParameters)para);
				logger.debug("Start Receive:" + sdf.format(Calendar.getInstance().getTime()));
				logger.debug(events == null ? RET_NO_ERROR + "\n" : RET_NO_ERROR + ":" + events.length + "\n");
				return ProcessResult.buildAffectedEventResult(events);
			} 
		}
		// Return as Error
		return ProcessResult.buildErrorResult(para.getRes_xml());
	}

	protected ProcessResult processSendCarProbe(final Payload payload, final IProbeDataProcess p) {
		// Car Probe
		// Get Request Parameters 
		IDataParameters para = new CarProbeParameters(config.getMm(), def_n_tenant, def_tenant, config.getRm());
		if(payload.loadParameters(para)) {
			if(para.isAsync()) {
				// If Async, Thread is invoked from here
				executorService.execute(new SampleClientAsyncThread(para, p));
				return ProcessResult.buildNoneResult();
			} else {
				// Process Car Probe
				@SuppressWarnings("unchecked")
				Collection<Action> actions = (Collection<Action>) p.processCarProbe((CarProbeParameters)para);
				if(actions == null) {
					logger.warn("processCarProbe returned null unexpectedly");
				} else {
					ActionContents ac = new ActionContents();
					for (Action act : actions) {
						final String actionType = act.getAction_type().toUpperCase();
						switch (actionType) {
							case Action.VEHICLE_ACTION:
								if (act.getContents() instanceof Event[]) {
									Event[] events = (Event[]) act.getContents();
									ac.getAffectedEvents().addAll(Arrays.asList(events));
								}
								break;
							case Action.VEHICLEACTION_EVENTNOTIFICATION:
								if (act.getContents() instanceof MessageNotification) {
									ac.getNotifiedMessages().add((MessageNotification) act.getContents());
								}
								break;
							case Action.PUSHACTION_SIMPLEMSG:
								if (act.getContents() instanceof String) {
									MessageNotification msg = new MessageNotification();
									msg.setMsg((String)act.getContents());
									ac.getNotifiedMessages().add(msg);
								}
								break;
							default:
								// TODO Other Actions - Notification, etc..
						}
					}
					if (isPushClient() && (!ac.getAffectedEvents().isEmpty() || !ac.getNotifiedMessages().isEmpty())) {
						DisplayActionContents cont = null;
						synchronized(rf) {
							cont = rf.copyActionContents(ac);
						}
						String message = null;
						synchronized(mapper) {
							try {
								message = mapper.writeValueAsString(cont);
								logger.debug("Message: " + message);
								String[] target_vehicles = new String[1];
								target_vehicles[0] = ((CarProbeParameters)para).getCb().getVehicle_id();
								Action action = new Action();
								action.setTarget_vehicles(target_vehicles);
								action.setContents(message);
								push(action);
							} catch (IOException e) {
								logger.error(e.getMessage(), e);
								return ProcessResult.buildErrorResult(e.getMessage());
							}
						}
					}else{
						return ProcessResult.buildNoneResult();
					}
					return ProcessResult.buildActionContentsResult(ac);
				}
			} 
		} else {
			// Return as Error
			return ProcessResult.buildErrorResult(para.getRes_xml());
		}
		return null;
	}

	protected ProcessResult processSendEvent(final Payload payload, final IProbeDataProcess p) {
		// Send Event
		IDataParameters para = new SendEventParameters(config.getMm(), def_n_tenant, def_tenant, config.getRm(), config);
		if(payload.loadParameters(para)) {
			if(para.isAsync()) {
				// If Async, Thread is invoked from here
				executorService.execute(new SampleClientAsyncThread(para, p));
				return ProcessResult.buildNoneResult();
			} else {
				String event_id = (String) p.processEvent((SendEventParameters)para);
				// Process Here
				// Event Receive
				logger.debug("Start Receive:" + sdf.format(Calendar.getInstance().getTime()));
				logger.debug(RET_NO_ERROR + ":" + event_id + "\n");
				// Process Event
				return ProcessResult.buildEventIdResult(event_id, para.getRes_xml());
			} 
		}
		// Return as Error
		return ProcessResult.buildErrorResult(para.getRes_xml());
	}

	protected MobilityConfig getConfig(){
		return this.config;
	}
	protected String getMyname(){
		return this.myname;
	}
}
