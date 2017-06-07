package com.ibm.mobility.agent.sample;

import java.util.Properties;

import com.ibm.mobility.agent.EventOperator;
import com.ibm.mobility.data.tuple.CarProbe;
import com.ibm.mobility.data.tuple.Driver;
import com.ibm.mobility.data.tuple.Vehicle;
import com.ibm.mobility.rules.IComplexRuleMethod;
import com.ibm.mobility.rules.OperatorEnum;
import com.ibm.mobility.rules.ValueCompare;

public class LowFuelCondition implements IComplexRuleMethod{
	private static final String VEHICLE_PROP_FUEL_TANK = "FUELTANK";
	private static final String PROBE_PROP_FUEL = "fuel";

	private OperatorEnum operator = OperatorEnum.LT;
	private float fuelLevel = 0.1F;

	@Override
	public void init(Properties arg0) {
	}
	@Override
	public boolean check(EventOperator op, CarProbe cb, Vehicle v, Driver d) {
		float fuel = Float.parseFloat(cb.getProperty(PROBE_PROP_FUEL));
		int tank = Integer.parseInt(v.getProps(VEHICLE_PROP_FUEL_TANK));
		return ValueCompare.compareFloat(operator, fuel/tank, fuelLevel);
	}

	@Override
	public void exec(EventOperator op, CarProbe cp, Vehicle v, Driver d, Properties prop) {
	}
}
