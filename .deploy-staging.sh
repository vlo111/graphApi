#!/bin/bash

# Get Servers list
set -f
string=$STAGE_DEPLOY_SERVER
array=(${string//,/ })

# Iterate servers for deploy and pull last commit
for i in "${!array[@]}"; do
    echo "Deploy project on server ${array[i]}"
    ssh root@${array[i]} "cd /var/www/graphs-backend && git pull && yarn && yarn migrate-dev && pm2 restart Backend-dev"
done
