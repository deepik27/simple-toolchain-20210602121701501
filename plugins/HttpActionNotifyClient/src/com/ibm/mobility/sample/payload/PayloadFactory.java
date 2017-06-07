package com.ibm.mobility.sample.payload;

import com.ibm.mobility.util.MobilityConfig;

public class PayloadFactory {
	private enum PayloadType {
		CSV {
			@Override
			Payload createPayload(MobilityConfig config, String myname, String payloadStr, String cmd) {
				return new CSVPayload(config, myname, payloadStr, cmd);
			}
		},
		MQTTCSV {
			@Override
			Payload createPayload(MobilityConfig config, String myname, String payloadStr, String cmd) {
				return new MQTTCSVPayload(config, myname, payloadStr, cmd);
			}
		},
		JSON {
			@Override
			Payload createPayload(MobilityConfig config, String myname, String payloadStr, String cmd) {
				return new JSONPayload(config, myname, payloadStr, cmd);
			}
		};

		public static PayloadType getType(final String type) {
			PayloadType payloadType = PayloadType.valueOf(type.toUpperCase());
			return payloadType != null ? payloadType : PayloadType.CSV;
		}
		abstract Payload createPayload(final MobilityConfig config, final String myname, final String payloadStr, final String cmd);
	}

	private static PayloadFactory INSTANCE = new PayloadFactory();

	private PayloadFactory() {
	}

	public static PayloadFactory getInstance() {
		return INSTANCE;
	}

	public Payload createPayload(final String payloadType,
			final MobilityConfig config, final String myname, final String payloadStr, final String cmd) {
		PayloadType type = PayloadType.getType(payloadType);
		return type.createPayload(config, myname, payloadStr, cmd);
	}
}
