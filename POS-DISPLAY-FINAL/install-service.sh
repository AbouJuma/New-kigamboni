#!/bin/bash

# Install Customer Display Bridge as a service
# Run this as root or with sudo

echo "Installing Customer Display Bridge service..."

# Copy service file to systemd
sudo cp display-bridge.service /etc/systemd/system/

# Reload systemd
sudo systemctl daemon-reload

# Enable service to start on boot
sudo systemctl enable display-bridge.service

# Start service now
sudo systemctl start display-bridge.service

# Check status
sudo systemctl status display-bridge.service

echo ""
echo "Service installed and started!"
echo "Commands to manage service:"
echo "  sudo systemctl start display-bridge.service"
echo "  sudo systemctl stop display-bridge.service"
echo "  sudo systemctl restart display-bridge.service"
echo "  sudo systemctl status display-bridge.service"
echo "  journalctl -u display-bridge.service -f  # View logs"
