# Reference: https://docs.docker.com/reference/dockerfile/
FROM ubuntu:24.04

RUN apt-get update \
    && apt-get install -y \
    git \
    python-is-python3 \
    python3 \
    python3-pip \
    python3-venv \
    && python3 -m venv /venv

COPY server/requirements.txt /tmp/requirements.txt
RUN /venv/bin/pip install -r /tmp/requirements.txt
