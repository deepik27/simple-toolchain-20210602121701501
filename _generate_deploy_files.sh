#!/bin/bash

if [ -z "$1" ]; then
	echo "You must provide the suffix as the first argument. 'nosuffix' to no suffix"
	exit 1;
fi

if [ "$1" == "nosuffix" ]; then
	SUFFIX=""
else
	SUFFIX=-$1
fi

CREATE_SCRIPT=./_deploy_create_services.sh
if [ ! -f $CREATE_SCRIPT.org ]; then
	mv $CREATE_SCRIPT $CREATE_SCRIPT.org
fi
sed 's@-SUFFIX-@'"$SUFFIX"'@g' $CREATE_SCRIPT.template > $CREATE_SCRIPT


MANIFEST_YML=./manifest.yml
if [ ! -f $MANIFEST_YML.org ]; then
	mv $MANIFEST_YML $MANIFEST_YML.org
fi
sed 's@-SUFFIX-@'"$SUFFIX"'@g' $MANIFEST_YML.template > $MANIFEST_YML

exit 0

#
# ------------ The deployment script template ----------
# 1. use the following as Deploy Script
# 2. add environment variable SUFFIX=<your suffix here>
#

#!/bin/bash

if [ ! -f _generate_deploy_files.sh ]; then
  echo "The _generate_deploy_files.sh is missing. Exiting.."
  exit 1
fi
echo "Generating deployment files for suffix '$SUFFIX'"
chmod +x _generate_deploy_files.sh
./_generate_deploy_files.sh $SUFFIX || exit 1
echo "Generated _deploy_create_services.sh"
cat _deploy_create_services.sh
echo "--"
echo "Generated manifest.yml"
cat manifest.yml
echo "--"

# create services
[ -f "_deploy_create_services.sh" ] && source _deploy_create_services.sh || echo "no create services script"
cf push "${CF_APP}"
# View logs
#cf logs "${CF_APP}" --recent
