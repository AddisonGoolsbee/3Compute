FROM python:3.12-alpine

# Install tini, tmux, and other dependencies using Alpine's package manager
USER root
RUN apk update && apk add --no-cache \
    tini \
    tmux \
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

# Copy our tmux config for the myuser home
COPY tmux.conf /home/myuser/.tmux.conf
RUN chown 999:995 /home/myuser/.tmux.conf

RUN echo 'umask 002' >> /etc/profile \
 && echo 'export PATH="$HOME/.local/bin:$PATH"' >> /etc/profile

USER myuser
WORKDIR /app

ENTRYPOINT ["/sbin/tini", "--"]
CMD ["sleep", "infinity"]
