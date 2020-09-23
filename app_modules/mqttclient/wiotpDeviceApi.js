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

const axios = require("axios");
const mqttConfig = require("./mqttConfig.js");

class IoTPlatformOrganizationAPI {
  isIoTPlatformAvailable = false;
	constructor() {
    this.isIoTPlatformAvailable = !!mqttConfig.org;
  }

  getDeviceType(deviceType) {
    return new Promise((resolve, reject) => {
      axios(this.getOptions("/device/types", "GET", {id: deviceType})).then(response => {
        if (response && response.data && response.data.results && response.data.results.length > 0) {
          resolve(response.data.results[0]);
        } else {
          resolve({});
        }
      }).catch(error => {
        reject(error);
      });
    });
  }

  registerDeviceType(deviceType) {
    const data = {
      id: deviceType,
      classId: "Device"
    }
    return new Promise((resolve, reject) => {
      axios(this.getOptions("/device/types", "POST", null, data)).then(response => {
        resolve(response && response.data);
      }).catch(error => {
        reject(error);
      });
    });
  }

  getDevice(deviceType, deviceId) {
    return new Promise((resolve, reject) => {
      axios(this.getOptions("/device/types/" + deviceType + "/devices/" + deviceId, "GET")).then(response => {
        if (response && response.data && response.data.results && response.data.results.length > 0) {
          resolve(response.data.results[0]);
        } else {
          resolve({});
        }
      }).catch(error => {
        reject(error);
      });
    });
  }

  getAllDevices(deviceType) {
    return new Promise((resolve, reject) => {
      axios(this.getOptions("/bulk/devices", "GET", deviceType)).then(response => {
        resolve(response && response.data && response.data);
      }).catch(error => {
        reject(error);
      });
    });
  }

  registerDevice(deviceType, deviceId, authToken, deviceInfo) {
    const data = {
      deviceId: deviceId,
      authToken: authToken,
      deviceInfo: deviceInfo
    }
    return new Promise((resolve, reject) => {
      axios(this.getOptions("/device/types/" + deviceType + "/devices", "POST", null, data)).then(response => {
        resolve(response && response.data);
      }).catch(error => {
        reject(error);
      });
    });
  }

  unregisterDevice(deviceType, deviceId) {
    return new Promise((resolve, reject) => {
      axios(this.getOptions("/device/types/" + deviceType + "/devices/" + deviceId, "DELETE")).then(response => {
        resolve(response && response.data);
      }).catch(error => {
        reject(error);
      });
    });
  }

  deleteMultipleDevices(devices) {
    return new Promise((resolve, reject) => {
      axios(this.getOptions("/bulk/devices/remove", "POST", null, devices)).then(response => {
        resolve(response && response.data);
      }).catch(error => {
        reject(error);
      });
    });
  }

  getOptions(path , method, params, body) {
    const opts = {
      url: 'https://' + mqttConfig.org + ".internetofthings.ibmcloud.com/api/v0002" + path,
      method: method,
      auth: {
        username: mqttConfig.credentials.username,
        password: mqttConfig.credentials.password,
      }
    }
    if (params) {
      opts.params = params;
    }
    if (body) {
      opts.data = body;
      opts.headers = { "Content-Type": "application/json; charset=UTF-8" };
    }
    return opts;
  }  
}

module.exports = wiotpAdmin = new IoTPlatformOrganizationAPI();
