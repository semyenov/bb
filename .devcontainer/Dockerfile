FROM mcr.microsoft.com/vscode/devcontainers/typescript-node:latest

# Set the build mode
ENV APP_BUILD_MODE development

# Install additional packages if needed
ENV DEBIAN_FRONTEND noninteractive
RUN apt-get update
RUN apt-get -y install --no-install-recommends \
  curl \
  git \
  apt-transport-https \
  ca-certificates \
  gnupg \
  zsh \
  git \
  git-lfs

RUN apt-get clean -y
RUN rm -rf /var/lib/apt/lists/*

# Set the default shell to zsh
ENV SHELL /bin/zsh
