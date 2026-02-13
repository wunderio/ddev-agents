#ddev-generated
# Install and configure SSH server for remote command execution

# Install SSH server
RUN apt-get update && \
    DEBIAN_FRONTEND=noninteractive apt-get install -y \
        openssh-server \
    && apt-get clean \
    && rm -rf /var/lib/apt/lists/*

# Copy custom sshd configuration
COPY sshd_config /etc/ssh/sshd_config

# Create /run/sshd directory and set permissions
RUN mkdir -p /run/sshd && \
    chmod 755 /run/sshd

# Generate host keys during build
RUN ssh-keygen -A