FROM docker.io/node:8.9.0-alpine

# 基础服务
RUN apk update
RUN apk add libc6-compat \
    && apk add ca-certificates \
    && apk add openssl \
    && apk add curl \
    && apk add python \
    && apk add make \
    && apk add g++

# 拷贝项目
RUN mkdir -p /opt/app
COPY . /opt/app
WORKDIR /opt/app
RUN sh ./bin/proxy.sh \
    && rm -rf ./node_modules \
    && npm install

# this should start three processes, mysql and ssh
# in the background and node app in foreground
# isn't it beautifully terrible? <3

CMD ["sh", "start.sh"]

EXPOSE 8080 8080
EXPOSE 2370 2370