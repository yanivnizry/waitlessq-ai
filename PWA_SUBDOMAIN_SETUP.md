# PWA Subdomain Preview Setup

The PWA Generator now supports automatic subdomain preview for each organization's PWA. Each organization gets its own subdomain like `org-1.localhost:8001`.

## 🚀 **How It Works**

When a PWA is generated for organization ID `1`, it becomes accessible at:
- **Original URL**: `http://localhost:8001/pwa/org-1`
- **Subdomain URL**: `http://org-1.localhost:8001`

## 🔧 **Local Development Setup**

### Option 1: Hosts File Configuration (Recommended)

Add these entries to your `/etc/hosts` file (macOS/Linux) or `C:\Windows\System32\drivers\etc\hosts` (Windows):

```
127.0.0.1   org-1.localhost
127.0.0.1   org-2.localhost
127.0.0.1   org-3.localhost
# Add more as needed for your organizations
```

After adding these entries, you can access PWAs directly at:
- `http://org-1.localhost:8001`
- `http://org-2.localhost:8001`
- etc.

### Option 2: Browser Testing with Developer Tools

1. Open Developer Tools (F12)
2. Go to Network tab
3. Right-click and select "Use large request rows" (Chrome) or similar
4. Modify requests to include custom Host header: `org-1.localhost:8001`

### Option 3: Using curl for Testing

Test subdomain functionality with curl:

```bash
# Test organization 1 PWA
curl -H "Host: org-1.localhost:8001" "http://localhost:8001/"

# Test specific files
curl -H "Host: org-1.localhost:8001" "http://localhost:8001/manifest.json"
```

## 🎯 **PWA Generation Response**

When generating a PWA, you now get subdomain information:

```json
{
  "organization_id": 1,
  "pwa_url": "/pwa/org-1",
  "pwa_type": "client",
  "status": "generated",
  "full_url": "http://localhost:8000/pwa/org-1",
  "subdomain_url": "http://org-1.localhost:8001",
  "subdomain_preview": "org-1.localhost:8001"
}
```

## 🌐 **Production Setup**

For production deployment, configure DNS to point subdomains to your PWA Generator:

```
# DNS Records
org-1.yourdomain.com  →  your-pwa-generator-server
org-2.yourdomain.com  →  your-pwa-generator-server
*.yourdomain.com      →  your-pwa-generator-server (wildcard)
```

## 📱 **Features**

- **Automatic Routing**: PWAs are automatically served based on subdomain
- **SPA Support**: Single Page Application routing with fallback to index.html
- **File Serving**: Static assets (CSS, JS, images) served correctly
- **Manifest Support**: PWA manifest.json accessible at subdomain/manifest.json
- **Service Worker**: Service worker available for offline functionality

## 🔍 **Debugging**

Check PWA Generator logs for subdomain routing:

```bash
tail -f logs/pwa-generator.log
```

Test subdomain extraction:

```bash
# Should return PWA content
curl -H "Host: org-1.localhost:8001" "http://localhost:8001/"

# Should return 404 for non-existent org
curl -H "Host: org-999.localhost:8001" "http://localhost:8001/"
```

## 🎨 **Integration with Settings**

The Settings page in the dashboard now shows:
- Generated PWA URLs
- Subdomain preview links
- Instructions for local testing

Users can click the subdomain preview link to open their PWA in a new tab (after setting up hosts file).
