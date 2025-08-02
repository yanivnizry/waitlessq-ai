#!/bin/bash

# SSL Certificate Generation Script for WaitLessQ
# This script generates self-signed certificates for development
# For production, use Let's Encrypt or your certificate authority

set -e

# Configuration
CERT_DIR="./nginx/ssl"
DOMAIN="yourdomain.com"
COUNTRY="US"
STATE="State"
CITY="City"
ORGANIZATION="WaitLessQ"
ORGANIZATIONAL_UNIT="IT Department"
EMAIL="admin@yourdomain.com"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

echo -e "${GREEN}WaitLessQ SSL Certificate Generator${NC}"
echo "======================================"

# Create SSL directory if it doesn't exist
if [ ! -d "$CERT_DIR" ]; then
    echo -e "${YELLOW}Creating SSL directory...${NC}"
    mkdir -p "$CERT_DIR"
fi

# Check if certificates already exist
if [ -f "$CERT_DIR/cert.pem" ] && [ -f "$CERT_DIR/key.pem" ]; then
    echo -e "${YELLOW}SSL certificates already exist.${NC}"
    read -p "Do you want to regenerate them? (y/N): " -n 1 -r
    echo
    if [[ ! $REPLY =~ ^[Yy]$ ]]; then
        echo -e "${GREEN}Using existing certificates.${NC}"
        exit 0
    fi
fi

echo -e "${YELLOW}Generating SSL certificates for development...${NC}"

# Generate private key
echo "Generating private key..."
openssl genrsa -out "$CERT_DIR/key.pem" 4096

# Generate certificate signing request
echo "Generating certificate signing request..."
openssl req -new -key "$CERT_DIR/key.pem" -out "$CERT_DIR/csr.pem" -subj "/C=$COUNTRY/ST=$STATE/L=$CITY/O=$ORGANIZATION/OU=$ORGANIZATIONAL_UNIT/CN=$DOMAIN/emailAddress=$EMAIL"

# Generate self-signed certificate with SAN
echo "Generating self-signed certificate..."
cat > "$CERT_DIR/cert.conf" << EOF
[req]
distinguished_name = req_distinguished_name
req_extensions = v3_req
prompt = no

[req_distinguished_name]
C = $COUNTRY
ST = $STATE
L = $CITY
O = $ORGANIZATION
OU = $ORGANIZATIONAL_UNIT
CN = $DOMAIN
emailAddress = $EMAIL

[v3_req]
keyUsage = keyEncipherment, dataEncipherment
extendedKeyUsage = serverAuth
subjectAltName = @alt_names

[alt_names]
DNS.1 = $DOMAIN
DNS.2 = *.$DOMAIN
DNS.3 = api.$DOMAIN
DNS.4 = dashboard.$DOMAIN
DNS.5 = pwa.$DOMAIN
DNS.6 = monitoring.internal.$DOMAIN
DNS.7 = localhost
IP.1 = 127.0.0.1
IP.2 = ::1
EOF

openssl x509 -req -in "$CERT_DIR/csr.pem" -signkey "$CERT_DIR/key.pem" -out "$CERT_DIR/cert.pem" -days 365 -extensions v3_req -extfile "$CERT_DIR/cert.conf"

# Generate DH parameters for perfect forward secrecy
echo "Generating DH parameters (this may take a while)..."
openssl dhparam -out "$CERT_DIR/dhparam.pem" 2048

# Create certificate chain (for self-signed, it's just the cert)
cp "$CERT_DIR/cert.pem" "$CERT_DIR/chain.pem"

# Set proper permissions
chmod 600 "$CERT_DIR/key.pem"
chmod 644 "$CERT_DIR/cert.pem" "$CERT_DIR/chain.pem" "$CERT_DIR/dhparam.pem"

# Clean up temporary files
rm -f "$CERT_DIR/csr.pem" "$CERT_DIR/cert.conf"

echo -e "${GREEN}SSL certificates generated successfully!${NC}"
echo ""
echo "Files created:"
echo "  - $CERT_DIR/cert.pem (Certificate)"
echo "  - $CERT_DIR/key.pem (Private key)"
echo "  - $CERT_DIR/chain.pem (Certificate chain)"
echo "  - $CERT_DIR/dhparam.pem (DH parameters)"
echo ""
echo -e "${YELLOW}IMPORTANT NOTES:${NC}"
echo "1. These are self-signed certificates for DEVELOPMENT ONLY"
echo "2. Browsers will show security warnings for self-signed certificates"
echo "3. For PRODUCTION, use certificates from a trusted CA like Let's Encrypt"
echo ""
echo -e "${GREEN}For production with Let's Encrypt:${NC}"
echo "1. Install certbot: sudo apt-get install certbot"
echo "2. Generate certificates: sudo certbot certonly --standalone -d $DOMAIN -d api.$DOMAIN -d dashboard.$DOMAIN -d pwa.$DOMAIN"
echo "3. Copy certificates to $CERT_DIR/"
echo "4. Set up auto-renewal: sudo crontab -e"
echo "   Add: 0 12 * * * /usr/bin/certbot renew --quiet"
echo ""
echo -e "${GREEN}Certificate generation complete!${NC}"