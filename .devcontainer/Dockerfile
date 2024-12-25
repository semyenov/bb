FROM mcr.microsoft.com/vscode/devcontainers/typescript-node:latest
ENV DEBIAN_FRONTEND noninteractive
ENV APP_BUILD_MODE development
ENV SHELL /bin/zsh

# Install additional packages if needed
RUN apt-get update
RUN apt-get -y install --no-install-recommends \
  curl \
  git \
  apt-transport-https \
  ca-certificates \
  gnupg \
  zsh \
  git \
  git-lfs && apt-get clean -y && rm -rf /var/lib/apt/lists/*
