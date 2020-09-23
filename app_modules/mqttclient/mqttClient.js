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

const mqtt = require("mqtt");
const mqttConfig = require("./mqttConfig.js");
const EventEmitter = require('events').EventEmitter;
const appEnv = require("cfenv").getAppEnv();

BM_APPLICATION_ID = appEnv.app.application_id || process.env.USER_PROVIDED_BM_APPLICATION_ID;

class MQTTClient {
  isMQTTBrokerAvailable = false;
	eventEmitter = new EventEmitter();

	constructor() {
//    const config = this.getConfig();
    const client = mqtt.connect(mqttConfig.connectionUrl, mqttConfig.credentials);
    if (!client) {
      console.error("Failed to create mqtt client for" + mqttConfig.connectionUrl);
      return;
    }
    client.on('connect', () => {
      if (mqttConfig.topicInfo.topic) {
        client.subscribe(mqttConfig.topicInfo.topic);
      }
    });
    client.on('message', (topic, message) => {
      const topicStrs = topic.split('/');
      if (mqttConfig.topicInfo.cmdIndex >= 0 && topicStrs.length > mqttConfig.topicInfo.cmdIndex) {
        const cmd = topicStrs[mqttConfig.topicInfo.cmdIndex];
        let type;
        if (mqttConfig.topicInfo.typeIndex >= 0 && topicStrs.length > mqttConfig.topicInfo.typeIndex) {
          type = topicStrs[mqttConfig.topicInfo.typeIndex];
        }
        let id;
        if (mqttConfig.topicInfo.idIndex >= 0 && topicStrs.length > mqttConfig.topicInfo.idIndex) {
          id = topicStrs[mqttConfig.topicInfo.idIndex];
        }
        let format;
        if (mqttConfig.topicInfo.fmtIndex >= 0 && topicStrs.length > mqttConfig.topicInfo.fmtIndex) {
          format = topicStrs[mqttConfig.topicInfo.fmtIndex];
        }

        if (format == 'json') {
          message = JSON.parse(message.toString())
        }
        this.eventEmitter.emit(cmd, message, type, id);
      }
    });

    this.isMQTTBrokerAvailable = true;
  }

  on(cmd, callback) {
    this.eventEmitter.on(cmd, callback);
  }

  getConfig() {
    let connectionUrl = process.env.MQTT_CONNECTION_URL;
    let clientId = process.env.MQTT_CLIENT_ID;
    let username = process.env.MQTT_USERNAME;
    let password = process.env.MQTT_PASSWORD;
    let messageTopic = process.env.MQTT_MESSAGE_TOPIC || 'iot-2/type/IBM/id/+/cmd/alert/fmt/json';

    if (!connectionUrl || !clientId || !username || !password) {
      let vcap;
      if (process.env.USER_PROVIDED_VCAP_SERVICES) {
        vcap = JSON.parse(process.env.USER_PROVIDED_VCAP_SERVICES);
      } else {
        vcap = VCAP_SERVICES;
      }
      if (vcap && vcap["iotf-service"] && vcap["iotf-service"].length > 0) {
        // IBM Watson IoT Platform
        let creds = vcap["iotf-service"][0].credentials;
        connectionUrl = "ssl:" + creds.mqtt_host + ":" + creds.mqtt_s_port;
        clientId = "A:" + creds.org + ":" + BM_APPLICATION_ID;
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
    const topicInfo = {
      topic: messageTopic,
      typeIndex: typeIndex,
      idIndex: idIndex,
      cmdIndex: cmdIndex,
      fmtIndex: fmtIndex
    }
    return {connectionUrl: connectionUrl, options: {clientId: clientId, username: username, password: password}, topicInfo: topicInfo};
  } 
}

module.exports = mqttClient = new MQTTClient();
