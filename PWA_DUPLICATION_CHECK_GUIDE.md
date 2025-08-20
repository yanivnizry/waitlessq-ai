# PWA Subdomain Duplication Check System

## 🛡️ **Overview**

The PWA subdomain system now includes **comprehensive duplication checking** to prevent conflicts when users choose app names.

## ✅ **What Gets Checked**

### **1. 🔍 Existing PWA Configs**
- Checks if another organization has a PWA with an app name that would generate the same subdomain
- **Case-insensitive** and **punctuation-insensitive** matching
- Examples:
  - `"Sunny Dental Clinic"` conflicts with `"SUNNY DENTAL CLINIC"`
  - `"Happy-Go Dental"` conflicts with `"Happy Go Dental"`

### **2. 🏢 Organization Subdomains & Slugs**
- Checks against existing organization `subdomain` fields
- Checks against existing organization `slug` fields
- Prevents conflicts with business URLs

### **3. 🚫 Reserved Subdomains**
Protected system subdomains that cannot be used:
```
www, api, admin, app, mail, email, ftp, blog, shop, store, 
support, help, docs, status, cdn, static, assets, media, 
images, js, css, fonts, waitlessq, staging, test, dev, 
production, prod
```

## 🔧 **API Endpoints**

### **Check App Name Availability**
```http
GET /api/v1/pwa/check-subdomain/{app_name}
```

**Response:**
```json
{
  "available": true,
  "app_name": "Sunny Dental Clinic",
  "generated_subdomain": "sunny_dental_clinic",
  "message": "Subdomain is available"
}
```

**Error Response:**
```json
{
  "available": false,
  "app_name": "API Services",
  "generated_subdomain": "api_services",
  "message": "'api_services' contains reserved word 'api'"
}
```

### **Automatic Checking**
Duplication checks are **automatically performed** when:
- Creating PWA config: `POST /api/v1/pwa/config`
- Updating PWA config: `PUT /api/v1/pwa/config/{id}`
- Saving PWA config: `POST /api/v1/pwa/save`

## 🚨 **Error Responses**

### **Conflict with Existing PWA**
```json
{
  "detail": "App name 'Sunny Dental Clinic' is not available: App name would conflict with existing PWA: 'SUNNY DENTAL CLINIC'"
}
```

### **Reserved Subdomain**
```json
{
  "detail": "App name 'API Services' is not available: 'api' is a reserved subdomain and cannot be used"
}
```

### **Organization Conflict**
```json
{
  "detail": "App name 'Downtown Medical' is not available: Subdomain conflicts with organization subdomain: 'Downtown Medical Center'"
}
```

## 🎯 **Conflict Detection Examples**

| App Name | Generated Subdomain | Status | Reason |
|----------|-------------------|---------|--------|
| `Sunny Dental Clinic` | `sunny_dental_clinic` | ✅ Available | Unique |
| `SUNNY DENTAL CLINIC` | `sunny_dental_clinic` | ❌ Conflict | Already exists |
| `Sunny-Dental Clinic` | `sunny_dental_clinic` | ❌ Conflict | Same as above |
| `API Services` | `api_services` | ❌ Reserved | Contains 'api' |
| `Admin Panel` | `admin_panel` | ❌ Reserved | Contains 'admin' |
| `Happy Medical Center` | `happy_medical_center` | ✅ Available | Unique |

## 💻 **Frontend Integration**

### **Real-time Checking**
```javascript
// Check app name availability as user types
async function checkAppNameAvailability(appName) {
    const response = await fetch(`/api/v1/pwa/check-subdomain/${encodeURIComponent(appName)}`, {
        headers: { 'Authorization': `Bearer ${token}` }
    });
    
    const result = await response.json();
    
    if (result.available) {
        showSuccess(`✅ "${result.generated_subdomain}" is available!`);
    } else {
        showError(`❌ ${result.message}`);
    }
}
```

### **Form Validation**
```javascript
// Validate before saving PWA config
function validateAppName(appName) {
    if (!appName.trim()) {
        return "App name is required";
    }
    
    // Check availability via API
    return checkAppNameAvailability(appName);
}
```

## 🛠️ **Implementation Details**

### **Subdomain Generation Logic**
```python
def generate_pwa_subdomain(app_name: str) -> str:
    if not app_name:
        return None
    
    # Convert to lowercase with underscores
    pwa_subdomain = app_name.lower().replace(" ", "_").replace("-", "_")
    # Remove special characters except underscores
    pwa_subdomain = re.sub(r'[^a-z0-9_]', '', pwa_subdomain)
    # Remove multiple consecutive underscores
    pwa_subdomain = re.sub(r'_+', '_', pwa_subdomain)
    # Remove leading/trailing underscores
    pwa_subdomain = pwa_subdomain.strip('_')
    
    return pwa_subdomain
```

### **Availability Check Logic**
```python
def check_subdomain_availability(subdomain: str, current_org_id: int, db: Session) -> tuple[bool, str]:
    # Check against existing PWAs
    # Check against organization subdomains/slugs  
    # Check against reserved words
    # Return (is_available, message)
```

## 🎉 **Benefits**

1. **🚫 Prevents Conflicts**: No duplicate subdomains
2. **🔒 Protects System**: Reserved words are blocked
3. **👥 User-Friendly**: Clear error messages
4. **⚡ Real-time**: Instant feedback during typing
5. **🛡️ Comprehensive**: Checks all potential conflicts

## 🧪 **Testing**

### **Test Cases**
- ✅ Unique app names generate available subdomains
- ❌ Duplicate app names (case variations) are rejected  
- ❌ Reserved words are blocked
- ❌ Organization conflicts are detected
- ✅ Valid variations are accepted

The duplication check system ensures **clean, unique subdomains** for every PWA! 🚀
