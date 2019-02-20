package com.ibm.mobility.agent.sample;

import java.util.Properties;

import org.apache.log4j.Level;
import org.apache.log4j.Logger;

import com.ibm.iot.cvi.plugin.log4j.PluginLogger;
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

	private Logger logger = PluginLogger.getLogger(HalfFuelCondition.class.getName());
	
	@Override
	public void init(Properties prop) {
		String message = prop.getProperty("message");
	    if (message != null){
	      String levelStr = prop.getProperty("level");
	      Level level = levelStr != null ? Level.toLevel(levelStr) : Level.INFO;
	      this.logger.log(level, message);
	    } else {
	      this.logger.info("PluginLog Test client is initialized.");
	    }
	}

	@Override
	public boolean check(EventOperator op, CarProbe cb, Vehicle v, Driver d) {
		String s_fuel = cb.getProperty(PROBE_PROP_FUEL);
		String s_tank = v.getProps(VEHICLE_PROP_FUEL_TANK);
		if(s_fuel == null || s_tank == null){
			this.logger.info("fuel or tank is null!");
			return false;
		}
		float fuel = Float.parseFloat(s_fuel);
		this.logger.info("fuel is"+fuel);
		int tank = Integer.parseInt(s_tank);
		this.logger.info("tank is"+s_tank);
		float fuelLevel = fuel/tank;
		this.logger.info("fuel level is"+fuelLevel);
		return ValueCompare.compareFloat(OperatorEnum.LT, fuelLevel, 0.5F)
			&& ValueCompare.compareFloat(OperatorEnum.GE, fuelLevel, 0.1F);
	}

	@Override
	public void exec(EventOperator op, CarProbe cp, Vehicle v, Driver d, Properties prop) {
	}
}
