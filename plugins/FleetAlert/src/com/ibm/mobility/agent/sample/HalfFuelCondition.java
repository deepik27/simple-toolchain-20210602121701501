package com.ibm.mobility.agent.sample;

import java.util.Properties;

import com.ibm.mobility.agent.EventOperator;
import com.ibm.mobility.data.tuple.CarProbe;
import com.ibm.mobility.data.tuple.Driver;
import com.ibm.mobility.data.tuple.Vehicle;
import com.ibm.mobility.rules.IComplexRuleMethod;
import com.ibm.mobility.rules.OperatorEnum;
import com.ibm.mobility.rules.ValueCompare;

public class HalfFuelCondition implements IComplexRuleMethod {
	private static final String VEHICLE_PROP_FUEL_TANK = "FUELTANK";
	private static final String PROBE_PROP_FUEL = "fuel";

	@Override
	public void init(Properties prop) {
	}

	@Override
	public boolean check(EventOperator op, CarProbe cb, Vehicle v, Driver d) {
		String s_fuel = cb.getProperty(PROBE_PROP_FUEL);
		String s_tank = v.getProps(VEHICLE_PROP_FUEL_TANK);
		if(s_fuel == null || s_tank == null){
			return false;
		}
		float fuel = Float.parseFloat(s_fuel);
		int tank = Integer.parseInt(s_tank);
		float fuelLevel = fuel/tank;
		return ValueCompare.compareFloat(OperatorEnum.LT, fuelLevel, 0.5F)
			&& ValueCompare.compareFloat(OperatorEnum.GE, fuelLevel, 0.1F);
	}

	@Override
	public void exec(EventOperator op, CarProbe cp, Vehicle v, Driver d, Properties prop) {
	}
}
