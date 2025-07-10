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
 && ln -sf python3 /usr/bin/python

# Create a non-root user and app dir
RUN useradd -m myuser \
    && mkdir /app \
    && chown myuser:myuser /app

# Copy our tmux config for the myuser home
COPY tmux.conf /home/myuser/.tmux.conf
RUN chown myuser:myuser /home/myuser/.tmux.conf

USER myuser
WORKDIR /app

ENTRYPOINT ["/sbin/tini", "--"]
CMD ["sleep", "infinity"]
