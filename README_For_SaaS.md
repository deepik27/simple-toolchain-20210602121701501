# IBM IoT for Automotive (SaaS) - Fleet Management Starter Application

The Fleet Management Starter Application for the IBM® IoT for Automotive SaaS offering demonstrates how quickly you can build an app on IBM Bluemix to manage and monitor a fleet of vehicles in real time.

## Overview

The Fleet Management Starter Application uses the IBM IoT for Automotive SaaS offering together with IBM Bluemix services to provide a sample solution for fleet operation management and personnel. By using the application,  you can easily track and view the following information:

- Availability of a fleet of cars on a map
- Location of vehicles
- Overall health of the entire fleet
- Health diagnostics and conditions of a specific vehicle in the fleet
- Condition of vehicles by order of severity or risk
- Event history for the entire fleet
- Event history for a specific vehicle in the fleet

The Fleet Management Starter Application uses the following IBM Bluemix services:

- [Cloudant NoSQL DB](https://console.ng.bluemix.net/catalog/services/cloudant-nosql-db/)
- [Secure Gateway(Optional)](https://console.ng.bluemix.net/catalog/services/secure-gateway/)
- [IBM Watson IoT Platform (Optional)](https://console.ng.bluemix.net/catalog/services/internet-of-things-platform/)

## Prerequisites
To deploy and use the Fleet Management Starter Application, you need an instance of IBM IoT for Automotive that is deployed and running on either IBM SaaS or IBM Bluemix. To use the app with an instance of IBM IoT for Automotive on IBM Bluemix, see the following instructions: 
[IBM for Automotive (Bluemix) - Fleet Management Starter Application](https://github.com/ibm-watson-iot/iota-starter-server-fm).

## Deploying the app

Deploy the Fleet Management Starter Application on IBM Bluemix either automatically or manually, as outlined in the following instructions.

### Automatically deploy the starter app on Bluemix

To automatically deploy the Fleet Management Starter Application on Bluemix, click [![Deploy to Bluemix](https://bluemix.net/deploy/button.png)](https://bluemix.net/deploy?repository=https://github.com/ibm-watson-iot/iota-starter-server-fm-saas.git). 

The automatic deployment option creates an instance of the app and the required Bluemix services, and also binds the services to the starter app automatically. After the automated deployment, complete the following steps to configure the app to manually to connect to your IBM IoT for Automotive SaaS service.

1. Open the Bluemix dashboard in your browser.
2. To stop the app, click **ACTIONS** > **Stop App**.

Next: Go to [Connecting to IoT for Automotive service](#connect2iot4a).

### Manually deploy the starter app on Bluemix

To manually deploy the Fleet Management Starter Application on IBM Bluemix, complete all of the following steps:

1. Log in to IBM Bluemix. If you do not have an existing Bluemix account, click [Register][bluemix_signup_url] and follow the instructions to create an account.
2. Download and install the [Cloud-foundry CLI][cloud_foundry_url] tool.
3. Clone the Fleet Management Starter Application to your local environment by using the following console command:  

  ```  
  git clone https://github.com/ibm-watson-iot/iota-starter-server-fm-saas.git  
  ```  
4. Change to the directory that you created.
5. Edit the `manifest.yml` file and change the values of `<name>` and `<host>` to something unique. `<host>` must be same with `postUrl` in gateway.properties.

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
   Note: The host value is used to generate your application URL, which is in the following syntax:  
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

11. Push the starter app to Bluemix by using the following command:
  ```
  $ cf push --no-start
  ```
  **Important:** When you run the `push` command, you must include the `--no-start` option as you must complete further steps manually before you start the app.

**Result:** Your very own instance of the IBM IoT for Automotive - Fleet Management Starter Application is now deployed on Bluemix.

## Deploying custom plugins to your IoT for Automotive instance
To run the Fleet Management Starter Application with your IoT for Automotive instance, the following two custom plugins must be deployed to your IoT for Automotive instance. The source code of the plugins is contained in `plugins` folder under the Fleet Management Starter Application repository.

|          Plugin        | Component              | Description                          |
|------------------------|------------------------|--------------------------------------|
| HttpActionNotifyClient | Vehicle Data Hub (VDH) | A VDH plugin that accepts sendCarProbe requests from simulated vehicles and POSTs affected events and notified messages to the Fleet Management Starter Application. |
| FleetAlert             | Agent                  | A rule plugin that calculates fuel level from fuel tank capacity of a vehicle and remaining fuel in received probe. A fuel alert rule estimates the value to generate a fuel warning to be notified to the Fleet Management Starter Application. |

To build and deploy the plugins, complete the following steps:

### Prerequisites
1. IoT for Automotive Plugin Deployment Tool has been installed on your IoT for Automotive SaaS instance. Ask an administrator of the IoT for Automotive SaaS offering if it has not been done.
1. IoT for Automotive Plugin Development Tool has been installed on your eclipse IDE according to <u>IoT for Automotive Plug-In Programmer's Guide</u>. Ask an administrator of your IoT for Automotive SaaS offering to get the guide and tool.
1. The Fleet Management Starter Application Git repository exists on your local environment. If you don't have, clone it by using the following console command.
    ```
    git clone https://github.com/ibm-watson-iot/iota-starter-server-fm-saas.git
    ```

### Import custom plugin projects to your eclipse IDE
1. Launch the eclipse that contains IoT for Automotive Plugin Development Tool.
1. Open Git perspective (**Window > Perspective > Open Perspective > Other...**).
1. From the **Git Repositories** view, click **Add an existing local Git repository**. Alternatively, you can also clone the repository by selecting **Clone a Git repository**.
1. Specify a directory that contains the Fleet Management Starter Application Git repository.
1. Select the Fleet Management Starter Application Git repository and click **Finish**.
1. Right click the added repository on Git Repositories view and select **Import Projects...**.
1. Select **Import existing Eclipse projects** and click **Next**.
1. Select `FleetAlert` and `HttpActionNotifyClient` and click **Finish**.

### Export custom plugin jars
1. Open Java perspective (**WIndow > Perspective > Open Perspective > Other...**) in your eclipse.
1. Right click the `HttpActionNotifyClient` project in **Package Explorer** view and select **Export...**.
1. Select **Java > JAR file** and click **Next**.
1. Input a file name in the **JAR file** field and click **Finish**.
1. In the same manner, export the `FleetAlert` project as a JAR file.

### Update a VDH configuration file (gatway.properties)
1. Download a copy of gateway.properties that has been deployed on VDH server by using IoT for Automotive Plugin Deploy Tool.
1. Open the gateway.properties file with a text editor.
1. Increment `client.num` in the gateway.properties.
1. Insert the following two lines before the DefaultHTTPClient client definition.
   ```
   client.client1=com.ibm.mobility.sample.http.HttpActionNotifyClient
   client.client1.protocol=http
   ```
1. Renumber all the existing client definition keys so as not to conflict with each other. For instance:
   ```
   client.client2=com.ibm.mobility.autodrive.client.def.DefaultHTTPClient
   client.client2.protocol=http
   client.client2.agent=SM_API
   ```
1. Insert the following client unique properties:
   ```
   HttpActionNotifyClient.postUrl=https://<your-iota-starter-fleetmanagement>.mybluemix.net
   HttpActionNotifyClient.postUser=starter
   HttpActionNotifyClient.postPassword=Starter4Iot
   ```
   1. Replace `postUrl` with your Fleet Management app URL.
   2. Replace postUser and postPassword with the right credentials if you have changed them.
   3. Save the changes and close the editor.

A fragment of the gateway.properties file exists under `conf` folder of the `HttpActionNotifyClient` project. You can copy contents from the file.

### Deploy custom plugins to IBM IoT for Automotive
1. Deploy exported `HttpActionNotifyClient` jar and updated gateway.properties to a VDH server using IoT for Automotive Plugin Deploy Tool.
1. Deploy export the `FleetAlert` jar to an Agent server.
1. Restart IoT for Automotive components using IoT for Automotive Plugin Deploy Tool as needed.

## <a id="connect2iot4a"></a> Connecting the app to your IBM IoT for Automotive service

After deploying the app on Bluemix, you must configure the app to connect to your IBM IoT for Automotive SaaS service instance.

### Configuring IBM IoT for Automotive endpoints and credentials
{: #config_endpoints}
To connect to your IBM IoT for Automotive service instance, the starter app reads the REST API endpoints and credentials from an environment variable on Bluemix. Configure the environment variables as follows:

1. Open the [Bluemix dashboard][bluemix_dashboard_url] in your browser.
1. Open the IBM IoT for Automotive service.
1. Select **Runtime** tab at the left navigation bar.
1. Click **Environment variables**.
1. Add the following environment variable:

```
USER_PROVIDED_VCAP_SERVICES = <endpoint definition in JSON format>
```
Define the endpoints in the following JSON format. Note that you must remove any line breaks that are at the end of each line to set to the environment value on Bluemix.
```
{
    "iotforautomotive": [
        {
            "credentials": {
                "api": <IoT for Automotive endpoint>,
                "username": <user name>,
                "password": <passsword>,
                "maximo": {
                  "orgid": <organization for IoT for Automotive>
                  "classificationid": <classification for Vehicle Data>
                  "username": <user name for Maximo API >,
                  "password": <passsword for Maximo API >
                }
            }
        }
    ]
}
```
To obtain the correct values, contact your system administrator.

Key | Description of Value
----- | -----
api | A URL to call the REST API for IoT for Automotive, which must end with a forward slash character (/) 
username | User name for accessing the Vehicle Data Hub (VDH) and other IoT for Automotive endpoints
password | Password for accessing the VDH and other IoT for Automotive endpoints
maximo/orgid | IBM IoT for Automotive Organization specified in IBM Maximo Asset Management 
maximo/classificationid | Classification for vehicle data defined in Maximo Asset Management
maximo/username | User name for accessing the Maximo Asset Management API
maximo/password | Password for accessing the Maximo Asset Management API

### (Optional) Securing the connection to the IBM IoT for Automotive service
The IBM Secure Gateway service provides secure connectivity and establishes a tunnel between your Bluemix organization and the remote location that you want to connect to. Before you use the Secure Gateway service, contact your IBM IoT for Automotive system administrator. For more information, see [Secure Gateway](https://console.ng.bluemix.net/catalog/services/secure-gateway/).


## Configuring authentication

To secure the app, authentication is enabled by default for the IoT for Automotive - Fleet Management Starter Application. The default user credentials are as follows:

User name | Password
----- | -----
starter | Starter4Iot

- To change the user name or password that is used by the app, edit the values that are specified for the `APP_USER` and the `APP_PASSWORD` environment variables.

- To remove authentication, set both the `APP_USER` and `APP_PASSWORD` environment variables to 'none'.

## <a name="run"></a> Starting the app

- To start the Fleet Management Starter Application, open the [Bluemix dashboard][bluemix_dashboard_url] and start the app.

Congratulations! You are now ready to use your own instance of the IBM IoT for Automotive - Fleet Management Starter Application. To connect to the app, enter the following URL in your browser:
`http://<host>.mybluemix.net` in your browser.

## (Optional) Connecting to an OBDII dongle that is plugged in to your car

The starter app also provides a mobile app to connect to an OBDII dongle plugged in to your car. The mobile app sends data from an OBDII dongle to the Fleet Management Starter Application through the Watson IoT Platform service and you can see the data in the app. Complete the steps below to enable this optional feature.

### Bind the Watson IoT Platform service to the app

1. Open the [Bluemix dashboard][bluemix_dashboard_url] in your browser.
1. Open the IBM IoT for Automotive service.
1. Select **Connections** tab at the left navigation bar.
1. Click **Connect New**.
1. Select *IBM Watson IoT Platform* service, and then click **Create** to bind the service.

### Create a device type for your device

When you start the OBDII Fleet Management App for the first time, your device is automatically registered to the Watson IoT Platform service with the default device type, which is __OBDII__. Create a device type for your device by completing the following steps:   

1. Open the Watson IoT Platform dashboard on Bluemix.
1. Click **Device**.
1. Click **Device Types**.
1. Click **+Create Type**.
1. Click **Create device type**.
1. In the **Name** field, enter 'OBDII'.
1. Leave the other fields as default and click **Next** at the bottom right until a device type is created.

### Set up the OBDII Fleet Management App

To build and install the OBDII Fleet Management App on an Android phone, see the following repository.
 - For Android phone : [IBM IoT for Automotive - OBDII Fleet Management App for Android](https://github.com/ibm-watson-iot/iota-starter-obd-android). 
 - For iOS phone :  [IBM IoT for Automotive - OBDII Fleet Management App for iOS](https://github.com/ibm-watson-iot/iota-starter-obd-ios). 
 
 After deploying the Fleet Management Starter Application, start OBDII Fleet Management App on your phone.

### Connect the device to the IoT for Automotive service

When you start the OBDII Fleet Management App for the first time, your device is registered automatically to the IoT Platform service that you have specified in the mobile app, and a corresponding vehicle is created automatically when you connect your device to the IoT Platform. 

Now that your device is connected to the Watson IoT Platform, go to the  **Map** or **Car Status** page in the app and see the status.

If you no longer need a device, go to the Watson IoT Platform dashboard and delete your device manually. After you delete a device, update the vehicles in the IBM IoT for Automotive service, as follows:

1. Open the Fleet Management Starter Application on your browser.
1. On the left navigation bar, click **Vehicle**.
1. On the top right side of the page, click **Sync with IoT Platform**.

A vehicle corresponding to deleted device must be removed from a table. Also, if you have added a device to the Watson IoT Platform manually, the vehicle is added to the table.

## Reporting defects
To report a defect with the IoT for Automotive - Fleet Management Starter Application, go to the [Issues section](https://github.com/ibm-watson-iot/iota-starter-server-fm-saas/issues) section.

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

## Providing feedback to IBM

Thank you for using our IBM® IoT for Automotive SaaS service and starter apps. As well as providing samples to help you get started, we'd like to know what you and your users think about our service offering. 

The IBM IoT for Automotive Fleet Management starter application sample also includes the [Medallia](http://www.medallia.com/) Net Promoter Score (NPS) widget code, which you can choose to deploy with the apps that you develop to integrate with the service.

### The Net Promoter Score widget
The NPS widget provides a mechanism for you and your app users to rate your overall experience with the IBM IoT for Automotive service and to provide specific feedback comments to help us to continually improve the quality of the service offering and to increase your satisfaction. When you build an application by using our sample code, the NPS widget is automatically included in your app and provides the following user interface for providing feedback to IBM:

![NPS Widget](./nps_widget.gif)

When you or your app users rate the IBM IoT for Automotive service by completing the survey in the NPS widget, the rating score, feedback comments, and customer ID are automatically submitted back to IBM.

### Disabling the NPS widget

By default, when you build an app by using the Fleet Management starter app sample code that is in this repository, the NPS widget is enabled. If you would like to remove the NPS widget from the user interface of your apps, complete the following steps:

1.  In this repository. go to the `/webclient` folder.
1.  Edit both the `index.html` and `index-prod.html`files and remove all of the code from ```<!-- NPS Widget BEGIN --> ``` to ``` <!-- NPS Widget END -->```.
1.  Save your changes.

### More information about the NPS widget

The IBM NPS widget is produced in partnership with [Medallia](http://www.medallia.com/). For information about the widget and the data that it collects, see [Privacy Policy - Medallia](http://www.medallia.com/privacy/).

## Useful links
- [IBM Bluemix](https://bluemix.net/)
- [IBM Bluemix Documentation](https://www.ng.bluemix.net/docs/)
- [IBM Bluemix Developers Community](http://developer.ibm.com/bluemix)
- [IBM Watson Internet of Things](http://www.ibm.com/internet-of-things/)
- [IBM Watson IoT Platform](http://www.ibm.com/internet-of-things/iot-solutions/watson-iot-platform/)
- [IBM Watson IoT Platform Developers Community](https://developer.ibm.com/iotplatform/)
- [IBM Secure Gateway](https://console.ng.bluemix.net/docs/services/SecureGateway/secure_gateway.html)
- [IBM Marketplace: IoT for Automotive](https://www.ibm.com/us-en/marketplace/iot-automotive-industry)

[bluemix_dashboard_url]: https://console.ng.bluemix.net/dashboard/
[bluemix_signup_url]: https://console.ng.bluemix.net/registration/
[cloud_foundry_url]: https://github.com/cloudfoundry/cli
