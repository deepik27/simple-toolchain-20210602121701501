/**
 * Copyright 2020 IBM Corp. All Rights Reserved.
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *      http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */
const appEnv = require("cfenv").getAppEnv();

/*
 * Environment variables. If these variables are not specified, the values are taken from VCAP_SERVICES for IBM Watson IoT Platform
 * 
 * MQTT_ORG_ID:         Organization ID for Watson IoT Platform. If this variable is specified, the app assumes that the message broker is IBM Watson IoT Platform
 * MQTT_CONNECTION_URL: URL to connect to the message broker
 * MQTT_CLIENT_ID:      The client ID for the message broker
 * MQTT_USERNAME:       The userid to connect to the message broker
 * MQTT_PASSWORD:       The password to connect to the message broker
 * MQTT_MESSAGE_TOPIC:  The topic to subscribe so as to receive messages from CVI
 */
function getConfig() {
  let applicationId = appEnv.app.application_id || process.env.USER_PROVIDED_BM_APPLICATION_ID;
  let orgId = process.env.IOTP_SERVICE_ORG || process.env.MQTT_ORG_ID;
  let connectionUrl = (process.env.MQTT_CONNECTION_URL) ? (process.env.MQTT_CONNECTION_URL) : (orgId ? ("ssl://" + orgId + ".messaging.internetofthings.ibmcloud.com:8883") : null);
  let clientId = (process.env.MQTT_CLIENT_ID) ? process.env.MQTT_CLIENT_ID : (orgId ? ("A:" + orgId + ":" + applicationId) : null);
  let username = process.env.MQTT_USERNAME;
  let password = process.env.MQTT_PASSWORD;
  let messageTopic = process.env.MQTT_MESSAGE_TOPIC || 'iot-2/type/+/id/+/cmd/+/fmt/+';

  if (!connectionUrl || !clientId || !username || !password) {
    let vcap;
    if (process.env.USER_PROVIDED_VCAP_SERVICES) {
      vcap = JSON.parse(process.env.USER_PROVIDED_VCAP_SERVICES);
    } else {
      vcap = VCAP_SERVICES;
    }
    if (vcap && vcap["iotf-service"] && vcap["iotf-service"].length > 0) {
      let creds = vcap["iotf-service"][0].credentials;
      orgId = creds.org;
      connectionUrl = "ssl:" + creds.mqtt_host + ":" + creds.mqtt_s_port;
      clientId = "A:" + orgId + ":" + applicationId;
      username = creds.apiKey;
      password = creds.apiToken;
    }
  }

  const topicStrs = messageTopic.split('/');
  let typeIndex = -1;
  let idIndex = -1;
  let cmdIndex = -1;
  let fmtIndex = -1;
  for (let i = 0; i < topicStrs.length; i++) {
    let str = topicStrs[i];
    if (str === "type") {
      typeIndex = i + 1;
    } else if (str === "id") {
      idIndex = i + 1;
    } else if (str === "cmd") {
      cmdIndex = i + 1;
    } else if (str === "fmt") {
      fmtIndex = i + 1;
    }
  }
  
  const credentials = {
    clientId: clientId, 
    username: username, 
    password: password
  }
  const topicInfo = {
    topic: messageTopic,
    typeIndex: typeIndex,
    idIndex: idIndex,
    cmdIndex: cmdIndex,
    fmtIndex: fmtIndex
  }
  return {connectionUrl: connectionUrl, org: orgId, credentials: credentials, topicInfo: topicInfo};
} 

module.exports = mqttConfig = getConfig();
