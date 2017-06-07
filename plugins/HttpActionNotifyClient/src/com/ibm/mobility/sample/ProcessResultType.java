package com.ibm.mobility.sample;

public enum ProcessResultType {
	EVENT_ID("event_id"),
	NONE("none"),
	ERROR("error"),
	AFFECTED_EVENT("affected_event"),
	ACTION_CONTENTS("action_contents"),
	VEHICLE("vehicle"),
	CAR_PROBE("carprobe"),
	REGION("region"),
	NUM_RECORDS("number_of_records"),
	GENERAL_TEXT("general_text"),
	GENERAL_BINARY("general_binary");

	private final String type;
	private ProcessResultType(String type){
		this.type = type;
	}
	public String getName(){
		return type;
	}
}
