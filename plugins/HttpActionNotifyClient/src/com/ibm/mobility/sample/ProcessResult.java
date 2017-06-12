package com.ibm.mobility.sample;

import com.ibm.mobility.autodrive.object.CarProbe;
import com.ibm.mobility.autodrive.object.Event;
import com.ibm.mobility.autodrive.object.Region;
import com.ibm.mobility.autodrive.object.Vehicle;
import com.ibm.mobility.autodrive.object.util.ActionContents;

public class ProcessResult {
	private ProcessResultType type;
	private Object contents;
	private String message;
	public ProcessResultType getType() {
		return type;
	}
	public void setType(ProcessResultType type) {
		this.type = type;
	}

	/**
	 * Result of IProbeDataProcess#processXXXXX
	 * It could be ..
	 * 
	 * null
	 * CarProbe[] (process, processGetCarProbe)
	 * event id as String (processEvent)
	 * Collection<Action> (processCarProbe)
	 * "" or null (processSpeedSign)
	 * Event[] (processEventQuery, processGetEvent)
	 * Vehicle[] (processGetVehicle)
	 * 
	 * @return
	 */
	public Object getContents() {
		return contents;
	}
	public void setContents(Object contents) {
		this.contents = contents;
	}
	public String getMessage() {
		return message;
	}
	public void setMessage(String message) {
		this.message = message;
	}
	@Override
	public String toString(){
		return "Type: " + type + ", Message: " + message + ", Contents: " + contents;
	}

	public static ProcessResult buildActionContentsResult(ActionContents ac){
		ProcessResult result = new ProcessResult();
		result.setType(ProcessResultType.ACTION_CONTENTS);
		result.setContents(ac);
		return result;
	}
	public static ProcessResult buildAffectedEventResult(Event[] events){
		ProcessResult result = new ProcessResult();
		result.setType(ProcessResultType.AFFECTED_EVENT);
		result.setContents(events);
		return result;
	}
	public static ProcessResult buildCarProbeResult(CarProbe[] carProbe){
		ProcessResult result = new ProcessResult();
		result.setType(ProcessResultType.CAR_PROBE);
		result.setContents(carProbe);
		return result;
	}
	public static ProcessResult buildErrorResult(String msgOrXml){
		ProcessResult result = new ProcessResult();
		result.setType(ProcessResultType.ERROR);
		result.setMessage(msgOrXml);
		return result;
	}
	public static ProcessResult buildEventIdResult(String event_id, String xml){
		ProcessResult result = new ProcessResult();
		result.setType(ProcessResultType.EVENT_ID);
		result.setContents(event_id);
		result.setMessage(xml);
		return result;
	}
	public static ProcessResult buildGeneralBinaryResult(byte[] contents){
		ProcessResult result = new ProcessResult();
		result.setType(ProcessResultType.GENERAL_BINARY);
		result.setContents(contents);
		return result;
	}
	public static ProcessResult buildGeneralTextResult(String contents){
		ProcessResult result = new ProcessResult();
		result.setType(ProcessResultType.GENERAL_TEXT);
		result.setContents(contents);
		return result;
	}
	public static ProcessResult buildNoneResult(){
		ProcessResult result = new ProcessResult();
		result.setType(ProcessResultType.NONE);
		return result;
	}
	public static ProcessResult buildNumRecordsResult(int num_records){
		ProcessResult result = new ProcessResult();
		result.setType(ProcessResultType.NUM_RECORDS);
		result.setContents(num_records);
		return result;
	}
	public static ProcessResult buildRegionResult(Region[] regions){
		ProcessResult result = new ProcessResult();
		result.setType(ProcessResultType.REGION);
		result.setContents(regions);
		return result;
	}
	public static ProcessResult buildVehiclesResult(Vehicle[] vehicles){
		ProcessResult result = new ProcessResult();
		result.setType(ProcessResultType.VEHICLE);
		result.setContents(vehicles);
		return result;
	}
	public static ProcessResult buildProcessResult(ProcessResultType type, String message, Object contents){
		ProcessResult result = new ProcessResult();
		result.setType(type);
		result.setMessage(message);
		result.setContents(contents);
		return result;
	}
}
