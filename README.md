# IoT for Automotive Starter app server
A demo app that uses Internet of Things Platform service.

## Overview
With IoT for Automotive Starter app, you will experience real-time monitoring and management of the car fleet on Bluemix.  
* On a map users can see availability of cars in the fleet, availability in different zones and cars that might be in critical conditions (e.g. low in fuel, engine over heated). Using the "Manage Vehicles" link, users can manage cars registered in the IoT Platform. Selecting the summary of cars that might be in critical conditions takes users to show the condition of cars in the fleet(sorted by by severity).  
* Users can get an overview of the health of the fleet. User can drill down into diagnostics details of a chosen vehicle.  
* Users can view event history(e.g. fuel is low, engine is too hot) of the fleet. User can drill down to view details of chosen vehicle in the fleet.

This app demonstrates how quickly you can build an app on Bluemix using the following services:

   * [IBM Watson IoT Platform](https://console.ng.bluemix.net/catalog/services/internet-of-things-platform/)
   * [Cloudant NoSQL DB](https://console.ng.bluemix.net/catalog/services/cloudant-nosql-db/)

You can follow the steps below to set up the IoT for Automotive Starter app.

## Deploy the app on Bluemix
You can deploy your own instance of IoT Automotive Starter app to Bluemix.
To do this, you can either use the _Deploy to Bluemix_ button for an automated deployment or follow the steps below to create and deploy your app manually.

[![Deploy to Bluemix](https://bluemix.net/deploy/button.png)](https://bluemix.net/deploy?repository=https://github.com/ibm-watson-iot/iota-starter-server-fm.git)

1. Create a Bluemix Account.

  [Sign up][bluemix_signup_url] for Bluemix, or use an existing account.

2. Download and install the [Cloud-foundry CLI][cloud_foundry_url] tool.

3. Clone the app to your local environment from your terminal using the following command:

  ```
  git clone  https://bluemix.net/deploy?repository=https://github.com/ibm-watson-iot/iota-starter-server-fm.git
  ```

4. `cd` into this newly created directory.

5. Edit the `manifest.yml` file and change the `<name>` and `<host>` to something unique.

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
  The host you use will determinate your application URL initially, for example, `<host>.mybluemix.net`.

6. Connect to Bluemix in the command line tool and follow the prompts to log in:

  ```
  $ cf api https://api.ng.bluemix.net
  $ cf login
  ```

7. Create Internet of Things Platform service in Bluemix.

  ```
  $ cf create-service iotf-service iotf-service-free IoTPlatform
  ```

8. This app uses Cloudant NoSQL DB service as well. Create the service in Bluemix.

  ```
  $ cf create-service cloudantNoSQLDB Shared MobilityDB
  ```

9. Push the app to Bluemix.
  ```
  $ cf push
  ```

You now have your very own instance of the IoT for Automotive Starter app on Bluemix.  

## Confirm the app health
1. Open the [Bluemix dashboard][bluemix_dashboard_url] in your browser.

2. Start the app if the app is not running.

Congratulations! You are ready to use your own instance of IoT for Automotive Starter app now. Open `http://<host>.mybluemix.net` in your browser and follow the instructions in the top page to connect your mobile app to the IoT for Automotive Starter app.

### Default user name and the password

To protect your app instance, access to the app needs user authentication. The default user name is `starter`, and the password is `Starter4Iot`.

You may change the user name and the password by setting `APP_USER` and `APP_PASSWORD` environment variables. You may also remove the authentication by specifying `none` to the both environment variables.

## Usage

## Implementation

## Report Bugs
If you find a bug, please report it using the [Issues section](https://github.com/ibm-watson-iot/iota-starter-server-fm/issues).

## Troubleshooting
The primary source of debugging information for your Bluemix app is the logs. To see them, run the following command using the Cloud Foundry CLI:

  ```
  $ cf logs <application-name> --recent
  ```
For more detailed information on troubleshooting your application, see the [Troubleshooting section](https://www.ng.bluemix.net/docs/troubleshoot/tr.html) in the Bluemix documentation.

## Privacy Notice

The IoT for Automotive Starter app includes code to track deployments to [IBM Bluemix](https://www.bluemix.net/) and other Cloud Foundry platforms. The following information is sent to a [Deployment Tracker](https://github.com/cloudant-labs/deployment-tracker) service on each deployment:

* Application Name (`application_name`)
* Space ID (`space_id`)
* Application Version (`application_version`)
* Application URIs (`application_uris`)
* Labels of bound services
* Number of instances for each bound service

This data is collected from the `VCAP_APPLICATION` and `VCAP_SERVICES` environment variables in IBM Bluemix and other Cloud Foundry platforms. This data is used by IBM to track metrics around deployments of sample applications to IBM Bluemix to measure the usefulness of our examples, so that we can continuously improve the content we offer to you. Only deployments of sample applications that include code to ping the Deployment Tracker service will be tracked.

### Disabling Deployment Tracking

Deployment tracking can be disabled by removing `require("cf-deployment-tracker-client").track();` from the beginning of the `app.js` main server file.

## Useful links
[IBM Bluemix](https://bluemix.net/)  
[IBM Bluemix Documentation](https://www.ng.bluemix.net/docs/)  
[IBM Bluemix Developers Community](http://developer.ibm.com/bluemix)  
[IBM Watson Internet of Things](http://www.ibm.com/internet-of-things/)  
[IBM Watson IoT Platform](http://www.ibm.com/internet-of-things/iot-solutions/watson-iot-platform/)  
[IBM Watson IoT Platform Developers Community](https://developer.ibm.com/iotplatform/)

[bluemix_dashboard_url]: https://console.ng.bluemix.net/dashboard/
[bluemix_signup_url]: https://console.ng.bluemix.net/registration/
[cloud_foundry_url]: https://github.com/cloudfoundry/cli
