# Place SSL certificates here for HTTPS configuration.
# Files expected:
#   - fullchain.pem   (certificate chain)
#   - privkey.pem     (private key)
#
# For LAN-only deployments, SSL is not required — HTTP is sufficient.
# For WireGuard VPN access, the VPN tunnel encrypts all traffic.
#
# To generate self-signed certs for testing:
#   openssl req -x509 -nodes -days 365 -newkey rsa:2048 \
#     -keyout privkey.pem -out fullchain.pem \
#     -subj "/CN=clovup.local"
