/************************************************************************
 * IBM Confidential
 *
 * OCO Source Materials
 *
 * (C) Copyright IBM Corp. 2013,2017
 *
 * The source code for this program is not published or otherwise 
 * divested of its trade secrets, irrespective of what has been deposited
 * with the U.S. Copyright Office.
 ************************************************************************/
package com.ibm.mobility.sample.http;

import java.io.BufferedWriter;
import java.io.IOException;
import java.io.InputStreamReader;
import java.io.OutputStreamWriter;
import java.io.Reader;
import java.net.HttpURLConnection;
import java.net.MalformedURLException;
import java.net.URL;
import java.nio.charset.StandardCharsets;
import java.security.KeyManagementException;
import java.security.NoSuchAlgorithmException;
import java.security.SecureRandom;
import java.security.cert.CertificateException;
import java.security.cert.X509Certificate;
import java.util.HashMap;
import java.util.Map;
import java.util.Map.Entry;

import javax.net.ssl.HostnameVerifier;
import javax.net.ssl.HttpsURLConnection;
import javax.net.ssl.SSLContext;
import javax.net.ssl.SSLSession;
import javax.net.ssl.SSLSocketFactory;
import javax.net.ssl.TrustManager;
import javax.net.ssl.X509TrustManager;
import javax.xml.bind.DatatypeConverter;

import org.codehaus.jackson.map.ObjectMapper;

import com.ibm.mobility.autodrive.client.ClientResponse;
import com.ibm.mobility.autodrive.client.def.http.IRequestWrapper;
import com.ibm.mobility.autodrive.client.util.DisplayActionContents;
import com.ibm.mobility.autodrive.object.Action;
import com.ibm.mobility.autodrive.parameter.Parameter;
import com.ibm.mobility.dynamicmap.util.LineTooLongException;
import com.ibm.mobility.dynamicmap.util.ReadLineUtil;
import com.ibm.mobility.sample.AbstractClient;
import com.ibm.mobility.sample.ProcessResult;
import com.ibm.mobility.sample.PropertyLoader;
import com.ibm.mobility.sample.payload.Payload;
import com.ibm.mobility.sample.payload.RequestWrapperPayload;
import com.ibm.mobility.util.MobilityConfig;
import com.ibm.mobility.util.MobilityLogger;

public class HttpActionNotifyClient extends AbstractClient {
	private final String PROP_USER_AGENT = "userAgent";
	private final String PROP_POST_URL = "postUrl";
	private final String PROP_POST_HEADERS = "postHeaders"; // Header1=Value1,Header2=Value2...
	private final String PROP_POST_CREDENTIAL = "postCredential"; // user:password as Base64
	private final String PROP_POST_USER = "postUser";
	private final String PROP_POST_PASSWORD = "postPassword";

	private final String DEFAULT_USER_AGENT = "IoT4A Starter App Fleet Management";
	private final String NOT_SUPPORTED = "<message>Access not Supported!</message>";

	private URL postUrl = null;
	private Map<String, String> postHeaders = new HashMap<String, String>();
	private boolean isHttps = false;
	private String credential = null;
	private SSLSocketFactory factory;

	private static ObjectMapper mapper = new ObjectMapper();
	private static MobilityLogger logger = MobilityLogger.getLogger(HttpActionNotifyClient.class.getCanonicalName());

	/*
	 * Initialize Routine
	 */
	public void init(MobilityConfig config, String myname) {
		super.init(config, myname);

		setHttp(true);

		PropertyLoader loader = getPropertyLoader();
		String ua = loader.getPropertyValue(PROP_USER_AGENT, DEFAULT_USER_AGENT);
		setUserAgent(ua);

		String strPostUrl = loader.getPropertyValue(PROP_POST_URL);
		strPostUrl += strPostUrl.endsWith("/") ? "" : "/" + "user/notifiedActions";
		try {
			this.postUrl = new URL(strPostUrl);
			logger.info("Post actions to " + this.postUrl);
		} catch (MalformedURLException e) {
			logger.error("Push URL specified by " + PROP_POST_URL + " is invalid: " + strPostUrl, e);
		}

		String strPostHeaders = loader.getPropertyValue(PROP_POST_HEADERS);
		if(strPostHeaders != null){
			for(String header : strPostHeaders.split(",")){
				String[] keyvalue = header.split("=");
				if(keyvalue.length == 2 && keyvalue[0].length() > 0){
					postHeaders.put(keyvalue[0], keyvalue[1]);
				}
			}
		}

		credential = loader.getPropertyValue(PROP_POST_CREDENTIAL);
		if(credential == null){
			String user = loader.getPropertyValue(PROP_POST_USER);
			String pass = loader.getPropertyValue(PROP_POST_PASSWORD);
			if(user != null && pass != null){
				credential = DatatypeConverter.printBase64Binary(String.valueOf(user + ":" + pass).getBytes());
			}
		}
		this.isHttps = "https".equalsIgnoreCase(this.postUrl.getProtocol());
		if(this.isHttps){
			TrustManager[] tm = {
					new X509TrustManager() {
						@Override
						public X509Certificate[] getAcceptedIssuers() {
							// TODO Should be implemented properly
							return null;
						}
						
						@Override
						public void checkServerTrusted(X509Certificate[] chain, String authType) throws CertificateException {
							// TODO Should be implemented properly
						}
						
						@Override
						public void checkClientTrusted(X509Certificate[] chain, String authType) throws CertificateException {
							// TODO Should be implemented properly
						}
					}
				};
				try {
					SSLContext context = SSLContext.getInstance("TLS");
					context.init(null, tm, new SecureRandom());
					factory = context.getSocketFactory();
				} catch (KeyManagementException e) {
					e.printStackTrace();
				} catch (NoSuchAlgorithmException e) {
					e.printStackTrace();
				}
		}
	}

	@Override
	public boolean isPushClient() {
		return true;
	}
	/**
	 * Call from Mobility Servlet when GET comes
	 * 
	 * @param HttpServletRequest
	 * @return String
	 */
	public Object call(Object o) {
		return call(o, null);
	}
	
	public Object call(Object o, Object e_o) {
		ClientResponse res = new ClientResponse();
		String cmd = null;

		if (!(o instanceof IRequestWrapper)) {
			res.setRes_type(ClientResponse.RES_TYPE_ERROR);
			res.setMsg(NOT_SUPPORTED);
			res.setPreferred_HTTP_status_code(ClientResponse.SC_INTERNAL_SERVER_ERROR);
			return res;
		}
		IRequestWrapper request = (IRequestWrapper) o;
		// Get command first
		cmd = request.getCmd();
		if(cmd == null) {
			// Not supported access
			res.setRes_type(ClientResponse.RES_TYPE_ERROR);
			res.setMsg(NOT_SUPPORTED);
			res.setPreferred_HTTP_status_code(ClientResponse.SC_BAD_REQUEST);
			return res;
		}

		// This client only support send car probe
		if(cmd.equalsIgnoreCase(Parameter.CMD_SEND_CARPROBE)) {
			Payload payload = new RequestWrapperPayload(getConfig(), getMyname(), request, cmd);
			ProcessResult result = processPayload(payload);
			res.setRes_type(result.getType().getName());
			res.setContents(result.getContents());
			res.setPreferred_HTTP_status_code(ClientResponse.SC_OK);
		}
		
		return res;
	}

	@Override
	public Object multiCall(Object o, Object e_o) {
		throw new UnsupportedOperationException("multiCall is not supported by " + HttpActionNotifyClient.class.getCanonicalName());
	}

	@Override
	public int push(Action action) {
		logger.info("An action is pushed: id=" + action.getAction_id()
		+ ", type=" + action.getAction_type()
		+ ", vehicles=" + action.getTarget_vehicles()
		+ ", contents=" + action.getContents()
		+ ", timestamp=" + action.getStart_time() + " - " + action.getEnd_time());
		if(postUrl == null){
			logger.error("Post URL property is not configured.");
			return 1;
		}
		logger.info("Post an action to: " + postUrl);
		
		HttpURLConnection connection = null;
		try {
			connection = (HttpURLConnection)postUrl.openConnection();
			connection.setDoOutput(true);
			connection.setRequestMethod("POST");
			if(isHttps){
				((HttpsURLConnection)connection).setHostnameVerifier(new HostnameVerifier() {
					@Override
					public boolean verify(String hostname, SSLSession session) {
						//TODO Should be implemented properly!
						return true;
					}
				});
				((HttpsURLConnection)connection).setSSLSocketFactory(factory);
			}

			connection.setRequestProperty("Accept", "application/json");
			for(Entry<String, String> entry : postHeaders.entrySet()){
				connection.setRequestProperty(entry.getKey(), entry.getValue());
			}
			if(credential != null){
				connection.setRequestProperty("Authorization", "Basic " + credential);
			}

			String strContents = (String)action.getContents();
			DisplayActionContents contents = mapper.readValue(strContents, DisplayActionContents.class);
			String[] vehicles = action.getTarget_vehicles();
			if(vehicles == null || vehicles.length <= 0){
				logger.error("No target vehicles.");
				return 1;
			}
			Map<String, DisplayActionContents> map = new HashMap<String, DisplayActionContents>();
			map.put(vehicles[0], contents);
			String body = mapper.writeValueAsString(map);

			connection.setRequestProperty("Content-Type", "application/json");
			connection.setRequestProperty("Content-Length", String.valueOf(body.length()));
			
			try (BufferedWriter writer = new BufferedWriter(new OutputStreamWriter(connection.getOutputStream(), StandardCharsets.UTF_8))){
				writer.write(body);
				writer.flush();
				
				int responseCode = connection.getResponseCode();
				if(responseCode >= 200 && responseCode < 300){
					try(Reader reader = new InputStreamReader(connection.getInputStream())){
						ReadLineUtil rlu = new ReadLineUtil(reader);
						String response;
						while((response = rlu.secureReadLine()) != null){
							logger.info(response);
						}
					}
				}else{
					logger.error("HTTP POST for push failed:");
					logger.error("\tResponse Code: " + responseCode);
					logger.error("\tURL: " + postUrl);
					return 1;
				}
			} catch (LineTooLongException e) {
				logger.error(e.getMessage(), e);
				return 1;
			}
		} catch (IOException e) {
			e.printStackTrace();
			return 1;
		}finally{
			if(connection != null){
				connection.disconnect();
			}
		}
		return 0;
	}
	
	@Override
	public void terminate() {
	}
	
}
