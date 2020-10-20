#!/bin/bash

# Get Servers list
set -f
string=$PROD_DEPLOY_SERVER
array=(${string//,/ })

# Iterate servers for deploy and pull last commit
for i in "${!array[@]}"; do
    echo "Deploy project on server ${array[i]}"
    ssh root@${array[i]} "cd /var/www/graphs.analysed.ai/graphs-backend/ && git pull && yarn && yarn migrate-prod && pm2 restart Backend-prod"
done

