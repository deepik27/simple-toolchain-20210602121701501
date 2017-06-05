/************************************************************************
 * Licensed Materials - Property of IBM
 *
 * (C) Copyright IBM Corp. 2017  All Rights Reserved.
 *
 * US Government Users Restricted Rights - Use, duplication or 
 * disclosure restricted by GSA ADP Schedule Contract with IBM Corp.
 ************************************************************************/
package com.ibm.mobility.sample;

import java.util.Properties;

import com.ibm.mobility.util.MobilityConfig;
import com.ibm.mobility.util.MobilityLogger;

/**
 * Utility class to load properties from configuration file
 */
public class PropertyLoader {
	// Set <logging traceSpecification="*=audit:com.ibm.mobility.sample.*=config" /> in server.xml to output debug log
	private final MobilityLogger logger = MobilityLogger.getLogger(PropertyLoader.class.getName());

	final Properties properties;
	final String name;
	
	public PropertyLoader(final MobilityConfig config, final String name) {
		assert(config != null);
		
		this.properties = config.getProps();
		this.name = name;
	}

	/**
	 * return properties for this app
	 * @return properties
	 */
	public Properties getProperties() {
		return properties;
	}
	
	/**
	 * Get a string value of a property with key 
	 * 
	 * @param props Properties
	 * @param key key to access the property. &lt;ClientName&gt;.&lt;key&gt;
	 * 
	 * @return a string value
	 */
	public String getPropertyValue(final String key) {
		return getPropertyValue(key, null);
	}

	/**
	 * Get a string value of a property with key 
	 * 
	 * @param props Properties
	 * @param key key to access the property. &lt;ClientName&gt;.&lt;key&gt;
	 * @param defaultValue default value when no value exists in the properties
	 * 
	 * @return a string value
	 */
	public String getPropertyValue(final String key, final String defaultValue) {
		return properties.getProperty(getPropertyKey(key), defaultValue);
	}

	/**
	 * Get a integer value of a property with key 
	 * 
	 * @param key key to access the property. &lt;ClientName&gt;.&lt;key&gt;
	 * @param defaultValue default value when no value exists in the properties
	 * 
	 * @return a integer value
	 */
	public int getIntPropertyValue(final String key, final int defaultValue) {
		String value = getPropertyValue(key, Integer.toString(defaultValue));
		if (value != null) {
			try {
				return Integer.parseInt(value);
			} catch(NumberFormatException e) {
				logger.error(e.getMessage(), e);;
			}
		}
		return defaultValue;
	}

	/**
	 * Get a boolean value of a property with key 
	 * 
	 * @param key key to access the property. &lt;ClientName&gt;.&lt;key&gt;
	 * 
	 * @return a boolean value
	 */
	public boolean getBooleanPropertyValue(final String key) {
		return getBooleanPropertyValue(key, false);
	}

	/**
	 * Get a boolean value of a property with key 
	 * 
	 * @param key key to access the property. &lt;ClientName&gt;.&lt;key&gt;
	 * @param defaultValue default value when no value exists in the properties
	 * 
	 * @return a boolean value
	 */
	public boolean getBooleanPropertyValue(final String key, final boolean defaultValue) {
		String value = getPropertyValue(key, Boolean.toString(defaultValue));
		if (value != null) {
			return Boolean.parseBoolean(value);
		}
		return defaultValue;
	}

	/**
	 * Get a string value of a property with key 
	 * 
	 * @param key key to access the property. &lt;ClientName&gt;.&lt;key&gt;
	 * 
	 * @return a string value
	 */
	private String getPropertyKey(final String key) {
		if (name == null)
			return key;
		return new StringBuffer(name).append('.').append(key).toString();
	}
}
