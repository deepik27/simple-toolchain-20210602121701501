package com.ibm.mobility.agent.sample;

import java.sql.Timestamp;
import java.util.Collection;
import java.util.Properties;

import org.apache.log4j.Level;
import org.apache.log4j.Logger;

import com.ibm.iot.cvi.plugin.log4j.PluginLogger;
import com.ibm.mobility.agent.EventOperator;
import com.ibm.mobility.agent.customize.VAHandle;
import com.ibm.mobility.agent.customize.VAStateRecord;
import com.ibm.mobility.agent.customize.VAStateTree;
import com.ibm.mobility.agent.customize.VAStateTreeItem;
import com.ibm.mobility.data.tuple.CarProbe;
import com.ibm.mobility.data.tuple.Driver;
import com.ibm.mobility.data.tuple.Vehicle;
import com.ibm.mobility.rules.IComplexRuleMethod;

public class MovingAverageAcceleration implements IComplexRuleMethod {
	static final String VASTATE_TYPE = "Edge";
	static final String VASTATE_HISTORICAL = "Historical";
	static final String VASTATE_CPCOUNT = "CPCount";
	
	static final String VASTATE_AVG_SPEED = "AvgSpeed";
	static final String VASTATE_AVG_ACCEL = "AvgAccel";
	static final String VASTATE_AVG_HEADING = "AvgHeading";
	static final String VASTATE_SPEED = "Speed";	
	static final String VASTATE_ACCEL = "Accel";
	static final String VASTATE_HEADING = "Heading";
	static final String VASTATE_DISTANCE = "Distance";
	static final String VASTATE_MOVEDISTANCE = "MoveDistance";
	static final String VASTATE_LINKID = "LinkID";
	static final String VASTATE_CPTIME = "CPTime";
	
	static final String ITEM_SPEED = "Speed";
	static final String ITEM_HEADING = "Heading";
	static final String ITEM_ACCEL = "Accel";
	static final String ITEM_SEQ = "Seq";
	static final String ITEM_TIME = "Time";
	
	static final String VASTATE_MAXRECORD = "MaxRecord";
	static final String VASTATE_RULETYPE = "RuleType";
	
	private Logger logger = PluginLogger.getLogger(MovingAverageAcceleration.class.getName());
	
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
	    //this.logger.info("Current stacktrace: "+Arrays.toString(Thread.currentThread().getStackTrace()));
	}

	@Override
	public void exec(EventOperator op, CarProbe cp, Vehicle v, Driver d,
			Properties prop) {
		//this.logger.info("Current stacktrace: "+Arrays.toString(Thread.currentThread().getStackTrace()));
		try {
			// props is a property having values if parameters are defined in a rule definition
			
			this.logger.info("======== VehicleActionRulePlugin#EXEC: CarProbe=" + cp);
			this.logger.info("======== VehicleActionRulePlugin#EXEC: Vehicle=" + v);
			this.logger.info("======== VehicleActionRulePlugin#EXEC: Driver=" + d);
			this.logger.info("======== VehicleActionRulePlugin#EXEC: prop=" + prop);

			int maxItems = Integer.parseInt(prop.getProperty(VASTATE_MAXRECORD, "10"));
			int ruleType = Integer.parseInt(prop.getProperty(VASTATE_RULETYPE, "1"));
			String stateKey = String.valueOf(ruleType);
			
			VAHandle vah = op.getVAHandle(VASTATE_TYPE);
			VAStateRecord rec = vah.getVAStateRecord(stateKey);
			if (rec == null) {
				rec = vah.createVAStateRecord(stateKey);
			}
			
			this.logger.info("******** VehicleActionRulePlugin#EXEC.EventOperator:" + op + " VAH:" + vah);
			this.logger.info("******** VehicleActionRulePlugin#EXEC.AvgSpeed:" + rec.getCommitValue(VASTATE_AVG_SPEED));
			this.logger.info("******** VehicleActionRulePlugin#EXEC.*AvgSpeed:" + rec.getValue(VASTATE_AVG_SPEED));
			
			// Check whether this method has already been called for the latest CarProbe
			// If so, skip this method
			Timestamp timestamp = (Timestamp)rec.getValue(VASTATE_CPTIME);
			this.logger.info("======== VehicleActionRulePlugin#EXEC: timestamp=" + timestamp + " carprobe.eventtime=" + cp.getEventTime());
			if (timestamp != null && timestamp.getTime() >= cp.getEventTime().getTime()) {
				return;
			}
			rec.putValue(VASTATE_CPTIME,cp.getEventTime());
			
			// Get the current counter
			long seq = 0L;
			Long prev_seq = (Long)rec.getValue(VASTATE_CPCOUNT);
			
			this.logger.info("======== VehicleActionRulePlugin#EXEC: VASTATE_CPCOUNT=" + prev_seq);
			
			if (prev_seq == null) {
				prev_seq = 0L;
				seq = 0L;
			} else {
				seq = prev_seq + 1;
			}
			rec.putValue(VASTATE_CPCOUNT,seq);
					
			VAStateTree tree = rec.getStateTree(VASTATE_HISTORICAL);
			this.logger.info("======== VehicleActionRulePlugin#EXEC: VASTATE_HISTORICAL=" + tree);
			VAStateTreeItem prevItem = null;
			if (tree == null) {
				tree = rec.createStateTree(VASTATE_HISTORICAL);
			} else {
				// Get the last record
				prevItem = tree.getTreeItem("N#" + prev_seq);
			}
			// put the latest values of CarProbe
			VAStateTreeItem newItem = tree.createTreeItem("N#" + seq);
			newItem.putValue(ITEM_SPEED, cp.getSpeed());
			newItem.putValue(ITEM_HEADING, cp.getHeading());
			this.logger.info("======== VehicleActionRulePlugin#EXEC: ITEM_HEADING=" + cp.getHeading());
			newItem.putValue(ITEM_SEQ, seq);
			newItem.putValue(ITEM_TIME, cp.getEventTime());

			Double new_accel = null;
			if (prevItem != null) {
				Integer prevSpeed = (Integer)prevItem.getValue(ITEM_SPEED);
				Timestamp prevTime = (Timestamp)prevItem.getValue(ITEM_TIME);
				Timestamp currentTime = cp.getEventTime();
				new_accel = ((double)(cp.getSpeed() - prevSpeed))/(currentTime.getTime() - prevTime.getTime())*1000;
				newItem.putValue(ITEM_ACCEL,(double)new_accel);
			} else {
				// the initial accel is just the current speed
				new_accel = (double)cp.getSpeed();
				newItem.putValue(ITEM_ACCEL,(double)new_accel);			
			}
			
			// Calculate moving averages and evict the oldest item if the number of items > maxItems
			long min = -1;
			VAStateTreeItem minItem = null;
			double avg_speed = 0.0;
			double avg_heading = 0.0;
			double avg_accel = 0.0;
			
			int num = 0;
			Collection<VAStateTreeItem> items = tree.getAllTreeItem();
			for(VAStateTreeItem it : items) {
				Long s = (Long)it.getValue(ITEM_SEQ);
				if (min < 0) {
					min = s;
					minItem = it;
				} else if (s < min) {
					min = s;
					minItem = it;
				}
				avg_speed += (int)it.getValue(ITEM_SPEED);
				avg_heading += (double)it.getValue(ITEM_HEADING);
				avg_accel += (double)it.getValue(ITEM_ACCEL);
				num++;
			}
			if (num > maxItems) {
				// evict the oldest item
				avg_speed -= (int)minItem.getValue(ITEM_SPEED);
				avg_heading -= (double)minItem.getValue(ITEM_HEADING);
				avg_accel -= (double)minItem.getValue(ITEM_ACCEL);
				minItem.remove();
				
				this.logger.info("======== VehicleActionRulePlugin#EXEC.remove:" + minItem);
				
				num--;
			}
			avg_speed = avg_speed/num;
			avg_heading = avg_heading/num;
			avg_accel = avg_accel/num;
			
			rec.putValue(VASTATE_AVG_SPEED, avg_speed);
			rec.putValue(VASTATE_AVG_HEADING, avg_heading);
			rec.putValue(VASTATE_AVG_ACCEL, avg_accel);
			
			// Calculate distance and set to VAState
			double move_distance = 0;
			long cur_linkid = cp.getLink_id();
			Double prev_distance = (Double)rec.getValue(VASTATE_DISTANCE);
			Long prev_linkid = (Long)rec.getValue(VASTATE_LINKID);
			if (prev_linkid == null || prev_linkid != cur_linkid) {
				move_distance = cp.getDistance();
			} else {
				move_distance = Math.abs(cp.getDistance() - prev_distance);
			}
			rec.putValue(VASTATE_DISTANCE, cp.getDistance());
			rec.putValue(VASTATE_MOVEDISTANCE,move_distance);
			rec.putValue(VASTATE_LINKID, cp.getLink_id());
			
			rec.putValue(VASTATE_SPEED, cp.getSpeed());
			rec.putValue(VASTATE_HEADING, cp.getHeading());
			rec.putValue(VASTATE_ACCEL, (double)new_accel);
			
			this.logger.info("======== VehicleActionRulePlugin#EXEC.rec:" + rec);
			this.logger.info("======== VehicleActionRulePlugin#EXEC.AvgSpeed:" + rec.getCommitValue(VASTATE_AVG_SPEED));
			this.logger.info("======== VehicleActionRulePlugin#EXEC.*AvgSpeed:" + rec.getValue(VASTATE_AVG_SPEED));

		} catch(Exception e) {
			e.printStackTrace();
		}
	}

	@Override
	public boolean check(EventOperator op, CarProbe cp, Vehicle v, Driver d) {
		return true;
	}
}
