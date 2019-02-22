package com.ibm.mobility.agent.accel;

import java.sql.Timestamp;
import java.util.Collection;
import java.util.Properties;

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
	
	static final String VASTATE_AVG_ACCEL = "AvgAccel";
	static final String VASTATE_SPEED = "Speed";	
	static final String VASTATE_ACCEL = "Accel";
	static final String VASTATE_CPTIME = "CPTime";
	
	static final String ITEM_SPEED = "Speed";
	static final String ITEM_ACCEL = "Accel";
	static final String ITEM_SEQ = "Seq";
	static final String ITEM_TIME = "Time";
	
	static final String VASTATE_MAXRECORD = "MaxRecord";
	static final String VASTATE_RULETYPE = "RuleType";
	
	private int maxItems;
	private int ruleType;
	private String stateKey;
	
	@Override
	public void init(Properties prop) {
		maxItems = Integer.parseInt(prop.getProperty(VASTATE_MAXRECORD, "10"));
		ruleType = Integer.parseInt(prop.getProperty(VASTATE_RULETYPE, "1"));
		stateKey = String.valueOf(ruleType);
	}

	@Override
	public void exec(EventOperator op, CarProbe cp, Vehicle v, Driver d,
			Properties prop) {
		try {
			// props is a property having values if parameters are defined in a rule definition			
			VAHandle vah = op.getVAHandle(VASTATE_TYPE);
			VAStateRecord rec = vah.getVAStateRecord(stateKey);
			if (rec == null) {
				rec = vah.createVAStateRecord(stateKey);
			}
			
			// Check whether this method has already been called for the latest CarProbe
			// If so, skip this method
			Timestamp timestamp = (Timestamp)rec.getValue(VASTATE_CPTIME);
			if (timestamp != null && timestamp.getTime() >= cp.getEventTime().getTime()) {
				return;
			}
			rec.putValue(VASTATE_CPTIME,cp.getEventTime());
			
			// Get the current counter
			long seq = 0L;
			Long prev_seq = (Long)rec.getValue(VASTATE_CPCOUNT);
			
			if (prev_seq == null) {
				prev_seq = 0L;
				seq = 0L;
			} else {
				seq = prev_seq + 1;
			}
			rec.putValue(VASTATE_CPCOUNT,seq);
					
			VAStateTree tree = rec.getStateTree(VASTATE_HISTORICAL);
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
			newItem.putValue(ITEM_SEQ, seq);
			newItem.putValue(ITEM_TIME, cp.getEventTime());

			Double new_accel = null;
			if (prevItem != null) {
				Integer prevSpeed = (Integer)prevItem.getValue(ITEM_SPEED);
				Timestamp prevTime = (Timestamp)prevItem.getValue(ITEM_TIME);
				Timestamp currentTime = cp.getEventTime();
				new_accel = ((double)(cp.getSpeed() - prevSpeed)/3.6)/(currentTime.getTime() - prevTime.getTime())*1000;
				newItem.putValue(ITEM_ACCEL,(double)new_accel);
			} else {
				// the initial accel is just the current speed
				new_accel = (double)cp.getSpeed();
				newItem.putValue(ITEM_ACCEL,(double)new_accel/3.6);			
			}
			
			// Calculate moving averages and evict the oldest item if the number of items > maxItems
			long min = -1;
			VAStateTreeItem minItem = null;
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
				avg_accel += (double)it.getValue(ITEM_ACCEL);
				num++;
			}
			if (num > maxItems) {
				// evict the oldest item
				avg_accel -= (double)minItem.getValue(ITEM_ACCEL);
				minItem.remove();
				num--;
			}
			avg_accel = avg_accel/num;			
			rec.putValue(VASTATE_AVG_ACCEL, avg_accel);						
			rec.putValue(VASTATE_SPEED, cp.getSpeed());
			rec.putValue(VASTATE_ACCEL, (double)new_accel);

		} catch(Exception e) {
		}
	}

	@Override
	public boolean check(EventOperator op, CarProbe cp, Vehicle v, Driver d) {
		return true;
	}
	
}
