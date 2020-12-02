#!/usr/bin/env bash
cd ./bin/redis
sudo cp ./redis_6379.conf /etc/redis.cnf
su -m nobody -c "redis-server /etc/redis.cnf"