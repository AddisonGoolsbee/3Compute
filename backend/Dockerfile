FROM python:3.12-alpine

# Install tini, dtach, and other dependencies using Alpine's package manager
USER root
RUN apk update && apk add --no-cache \
    tini \
    dtach \
    python3 \
    py3-pip \
    shadow \
    nano \
    git \
 && ln -sf python3 /usr/bin/python

# Create a non-root user matching the dedicated host system user
RUN addgroup -g 995 3compute-container \
    && adduser -D -u 999 -G 3compute-container myuser \
    && mkdir /app \
    && chown 999:995 /app


RUN echo 'umask 002' >> /etc/profile \
 && echo 'export PATH="$HOME/.local/bin:$PATH"' >> /etc/profile

USER myuser
WORKDIR /app

ENTRYPOINT ["/sbin/tini", "--"]
CMD ["sleep", "infinity"]
