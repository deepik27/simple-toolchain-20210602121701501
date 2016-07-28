#!/bin/bash 
cf create-service cloudantNoSQLDB Shared FleetCloudantDB
cf create-service iotforautomotive free_shared FleetIoTForAuto
