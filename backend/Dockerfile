FROM python:3.11-slim

# Install tini and other dependencies
USER root
RUN apt-get update \
    && apt-get install -y --no-install-recommends \
       python3 python3-pip \
       tini \
       tmux \
    && ln -s /usr/bin/python3 /usr/bin/python \
    && apt-get clean \
    && rm -rf /var/lib/apt/lists/*

# Create non-root user and app dir
RUN useradd -m myuser \
    && mkdir /app \
    && chown myuser:myuser /app

USER myuser
WORKDIR /app

ENTRYPOINT ["/usr/bin/tini", "--"]
CMD ["sleep", "infinity"]
