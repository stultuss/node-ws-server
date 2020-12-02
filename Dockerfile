FROM docker.io/node:lts-alpine

# 拷贝项目
RUN mkdir -p /opt/server
COPY . /opt/server
WORKDIR /opt/server
RUN ln -fs /opt/server/bin/timezone/Shanghai /etc/localtime \
  && echo "Asia/Shanghai" > /etc/timezone

RUN rm -rf ./node_modules \
    && npm install

# this should start three processes, mysql and ssh
# in the background and node app in foreground
# isn't it beautifully terrible? <3

## ENV
ENV NODE_ENV 'production'

## LOGGER
ENV LOGGER_LEVEL 'debug'

## REDIS
ENV REDIS_HOST '127.0.0.1'
ENV REDIS_PORT 3306
ENV REDIS_PWD '1q2w3e4r'

CMD ["sh", "start.sh"]

EXPOSE 8080 8080
EXPOSE 2370 2370