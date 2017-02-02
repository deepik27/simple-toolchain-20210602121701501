# IBM IoT for Automotive (SaaS) - Fleet Management Starter Application

The Fleet Management Starter Application for the IBM IoT for Automotive SaaS offering demonstrates how quickly you can build an app to manage and monitor a fleet of vehicles in real time.

## Overview

The Fleet Management Starter Application uses the IoT for Automotive SaaS offering on IBM Softlayer to provide a sample solution for fleet operation management and personnel. By using the application,  fleet managers can easily track and view the following information:

- Availability of a fleet of cars on a map
- Location of vehicles
- Overall health of the entire fleet
- Health diagnostics and conditions of a specific vehicle in the fleet
- Condition of vehicles by order of severity or risk
- Event history for the entire fleet
- Event history for a specific vehicle in the fleet

## Prerequisites
In order to use this app, you need to order an instance of IBM IoT for Automotive on SaaS. If you want to use the Fleet Management Starter Application with IoT for Automotive on Bluemix environment, see [IBM for Automotive - Fleet Management Starter Application](https://github.com/ibm-watson-iot/iota-starter-server-fm).

## Deploying the app on Bluemix automatically

You can automatically deploy an instance of the Fleet Management Starter Application on Bluemix by clicking [![Deploy to Bluemix](https://bluemix.net/deploy/button.png)](https://bluemix.net/deploy?repository=https://github.com/ibm-watson-iot/iota-starter-server-fm.git).

It creates an instance of the app and required Blumix services, and also binds the services to the starter app automatically. After the automated deployment, you need configure the app manually to connect to IoT for Automotive service. It is recommended to stop the App before going forward.

1. Open the Bluemix dashboard in your browser.
1. Stop the app by selecting Stop App menu item from ACTIONS.

If you have deployed the app automatically, skip the next step and go to the [Connecting to IoT for Automotive service](#connect2iot4a).

## Deploying the app on Bluemix manually

You can also deploy the app manually. To manually deploy your own instance of the Fleet Management Starter Application on Bluemix, complete all of the following steps:

1. [Register][bluemix_signup_url] an account on Bluemix or use an existing valid account.
2. Download and install the [Cloud-foundry CLI][cloud_foundry_url] tool.
3. Clone the Fleet Management Starter Application to your local environment by using the following console command:  

   ```  
   git clone https://github.com/ibm-watson-iot/iota-starter-server-fm.git  
   ```  

4. Change to the directory that you created.
5. Edit the `manifest.yml` file and change the values of `<name>` and `<host>` to something unique.

  ```
  applications:
         :
    host: iota-starter-server-fleetmanagement
    name: iota-starter-server-fleetmanagement
    memory: 512M
    path: .
    instances: 1
         :
   ```
   The host value is used to generate your application URL, which is in the following syntax:  
   `<host>.mybluemix.net`.

6. Install the NPM package by using the following command. The installer observes the dependencies that are specified in your `package.json` file.
   ```
  $ cd ./webclient
  $ npm install
   ```
7. Convert TypeScript to JavaScript:

   ```
   $ npm run tsc
   $ npm run gulp
   $ cd ..
   ```

8. By using the command line tool, connect to Bluemix and log in when prompted:

  ```
  $ cf api https://api.ng.bluemix.net
  $ cf login
  ```

9. Create an instance of the Cloudant NoSQL DB service in Bluemix:

  ```
  $ cf create-service cloudantNoSQLDB Lite FleetCloudantDB
  ```

11. Push the starter app to Bluemix by using the following command. Because you will need to perform more steps when the app is deployed, you must add the option `--no-start` when you run the `push` command.

  ```
  $ cf push --no-start
  ```
Your very own instance of the IBM IoT for Automotive - Fleet Management Starter Application is now deployed on Bluemix.

## <a id="connect2iot4a"></a> Connecting to IoT for Automotive service

### Configuring IoT for Automotive endpoints and credentials
The app reads REST API endpoints and credentials of IoT for Automotive from an environment variable on Bluemix to connect to the service. Set the environment valuable as follows.

1. Open the [Bluemix dashboard][bluemix_dashboard_url] in your browser.
1. Open the IBM IoT for Automotive service.
1. Select **Runtime** tab at the left navigation bar.
1. Click **Environment variables**
1. Add the following environment variable

```
USER_SPECIFIED_VCAPSERVIES = <endpoint definition in JSON format>
```

The endpoint definition should be written in the following JSON format. Note that you must eliminate a line break at the end of each line to set to the environment value on Bluemix.
```
{
    "iotforautomotive": [
        {
            "credentials": {
                "tenant_id": <tenant id>,
                "api": <IoT for Automotive endpoint>,
                "username": <user name>,
                "password": <passsword>,
                "maximo": {
                  "api": <Asset API endpoint>,
                  "username": <user name for asset API >,
                  "password": <passsword for asset API >
                }
            }
        }
    ]
}
```
Contact system administrator for each value.

Key | Description of Value
----- | -----
tenant id | tenant id
api | URL that ends with / to call REST API of IoT for Automotive
username | User name to access vehicle data hub and the other IoT for Automotive endpoint
password | Password to access vehicle data hub and the other IoT for Automotive endpoint
maximo/api | URL that ends with / to call Asset API of IoT for Automotive
maximo/username | User name to access Asset API
maximo/password | Password to access Asset API


### (Optional) A secure way to connect to the IoT for Automotive service
The IBM Secure Gateway service provides secure connectivity and establishes a tunnel between your Bluemix organization and the remote location that you want to connect to. Consult with a system administrator of IoT for Automotive beforehand to use the Secure Gateway service. See [Secure Gateway](https://console.ng.bluemix.net/catalog/services/secure-gateway/) for more details.

#### Setting up a Secure Gateway service

##### Binding the Secure Gateway service to the app
Firstly, bind the Secure Gateway service on Bluemix to your app as follows.

1. Open the [Bluemix dashboard][bluemix_dashboard_url] in your browser.
1. Open the IBM IoT for Automotive service.
1. Select **Connections** tab at the left navigation bar.
1. Click **Connect New**
1. Select *Secure Gateway* service and click *Create* to bind the service

You can also bind the service to the app using command line interface.

  ```
  $ cf create-service SecureGateway securegatewayplan FleetSecureGateway
  ```

##### Configuring the Secure Gateway service on Bluemix

Then, set up a destination for the app to connect to.

1. Open the Secure Gateway service on Bluemix.
1. Click ADD GATEWAY.
1. Input a gateway name, uncheck **Token Expiration**, and click **ADD GATEWAY**
1. Click the gateway rectangle created above
1. Click **Add Destination**
1. Check **On-Premises**
1. Enter a host address and port number of IoT for Automotive gateway
1. Select **HTTPS** for protocol
1. Select **Destination-Side** for authentication
1. Keep empty at IP table rules
1. Input a label of the destination and click **Finish**

Now, an endpoint URL of a gateway is created. Then, update the destination so that the destination can be accessed from the app only.

1. Click the destination created above
1. Exapand **Advanced** section
1. Check the **Restrict network access to cloud destination**
1. Click **UPDATE DESTINATION**

#### Setting up a client within IoT for Automotive environment
In order to create a gateway, you need to have a Secure Gateway client to connect to. Contact a system administrator of IoT for Automotive environment to set up the client.

#### Configuring the app for the Secure Gateway

Finally, replace endpoints specified in the environment variable with an endpoint of the Secure Gateway.

Also, set values copied above to new environment variables.

```
SECURE_GW_IPTABLE_CFG_GW_ID = <Gateway ID>
SECURE_GW_IPTABLE_CFG_GW_TOKEN = <Security Token>
SECURE_GW_IPTABLE_CFG_DEST_IDS = <Destination ID>
```

## Configuring authentication

To secure the app, authentication is enabled by default for the IoT for Automotive - Fleet Management Starter Application. The default user credentials are as follows:

User name | Password
----- | -----
starter | Starter4Iot

- To change the user name or password that is used by the app, edit the values that are specified for the `APP_USER` and `APP_PASSWORD` environment variables.

- To remove authentication, set both the `APP_USER` and `APP_PASSWORD` environment variables to 'none'.

## <a name="run"></a> Starting the app

- To start the Fleet Management Starter Application, open the [Bluemix dashboard][bluemix_dashboard_url] and start the app.

Congratulations! You are now ready to use your own instance of the IBM IoT for Automotive - Fleet Management Starter Application. Open `http://<host>.mybluemix.net` in your browser.

## (Optional) Connecting to an OBDII dongle plugged in to your car

The starter app provides a mobile app to connect to an OBDII dongle plugged in to your car. The mobile app sends data from an OBDII dongle to the Fleet Management Starter Application via IoT Platform service and you can see the data in the app. Follow the steps below to enable this optional feature.

### Bind the IoT Platform service to the app

1. Open the [Bluemix dashboard][bluemix_dashboard_url] in your browser.
1. Open the IBM IoT for Automotive service.
1. Select **Connections** tab at the left navigation bar.
1. Click **Connect New**
1. Select *Internet of Things Platform* service and click *Create* to bind the service

### Create a device type for your device

When you start a mobile app for the first time, your device is registered to the IoT Platform service automatically with a device type __OBDII__. The device type needs to be prepared beforehand.   

1. Launch the IoT Platform dashboard on Bluemix.
1. Open **Device** page
1. Open **Device Types** tab at top of the page
1. Click **+Create Type**
1. Click **Create device type**
1. Input 'OBDII' in **Name** field
1. Leave the other fields as default and click **Next** at the bottom right until a device type is created.

### Set up the OBDII Fleet Management App

Refer [IBM IoT for Automotive - OBDII Fleet Management App for Android](https://github.com/ibm-watson-iot/iota-starter-obd-android) to build and install a mobile app to your Android phone. Once you get ready to use it, start the mobile app on your phone.

### Connect the device to the IoT for Automotive service

When you start the mobile app for the first time, a device is registered automatically to the IoT Platform service that you have specified in the mobile app, and corresponding vehicle is created automatically when you connect your device to the IoT Platform. Now, your device is connected to the Fleet Management Starter Application. Go to **Map** or **Car Status** page in the app and see the status.

If you no longer need a device, go to IoT Platform dashboard and delete your device manually. Then, after you delete it, update vehicles in the IBM IoT for Automotive service as follows.

1. Open the Fleet Management Starter Application on your browser.
1. Select **Vehicle** tab at the left navigation bar.
1. Click **Sync with IoT Platform** at top right of the page.

A vehicle corresponding to deleted device must be removed from a table. Also, if you have added new device to IoT Platform manually, new vehicle is added to the table.

## Reporting defects
To report a defect with the IoT for Automotive - Mobility Starter Application mobile app, go to the [Issues section](https://github.com/ibm-watson-iot/iota-starter-server-fm/issues) section.

## Troubleshooting
To debug problems, check the Bluemix app logs. To view the logs, run the following command from the Cloud Foundry CLI:

  ```
  $ cf logs <application-name> --recent
  ```
For more information about how to troubleshoot your application, see the [Troubleshooting section](https://www.ng.bluemix.net/docs/troubleshoot/tr.html) in the Bluemix documentation.

## Privacy Notice

The IoT for Automotive - Fleet Management Starter Application includes code to track deployments to [IBM Bluemix](https://www.bluemix.net/) and other Cloud Foundry platforms.

For each instance that you deploy, the following information is sent to a [Deployment Tracker](https://github.com/cloudant-labs/deployment-tracker) service:

* Application name (`application_name`)
* Space ID (`space_id`)
* Application version (`application_version`)
* Application URIs (`application_uris`)
* Labels of bound services
* Number of instances for each bound service

The tracked data is collected from the `VCAP_APPLICATION` and `VCAP_SERVICES` environment variables in IBM Bluemix and other Cloud Foundry platforms. We use the data to track metrics around deployments of sample applications to IBM Bluemix to measure the usefulness of our examples so that we can continuously improve the content that we offer to you. Only deployments of sample applications that include code to ping the Deployment Tracker service are tracked.

### Disabling deployment tracking

You can disable the Deployment Tracker service by removing `require("cf-deployment-tracker-client").track();` from the beginning of the `app.js` server file.

## Useful links
- [IBM Bluemix](https://bluemix.net/)
- [IBM Bluemix Documentation](https://www.ng.bluemix.net/docs/)
- [IBM Bluemix Developers Community](http://developer.ibm.com/bluemix)
- [IBM Watson Internet of Things](http://www.ibm.com/internet-of-things/)
- [IBM Watson IoT Platform](http://www.ibm.com/internet-of-things/iot-solutions/watson-iot-platform/)
- [IBM Watson IoT Platform Developers Community](https://developer.ibm.com/iotplatform/)
- [IBM Secure Gateway](https://console.ng.bluemix.net/docs/services/SecureGateway/secure_gateway.html)

[bluemix_dashboard_url]: https://console.ng.bluemix.net/dashboard/
[bluemix_signup_url]: https://console.ng.bluemix.net/registration/
[cloud_foundry_url]: https://github.com/cloudfoundry/cli
