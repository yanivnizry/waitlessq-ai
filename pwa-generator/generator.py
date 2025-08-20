import os
import json
import shutil
from pathlib import Path
from jinja2 import Environment, FileSystemLoader
from typing import Dict, Any, Optional

class PWAGenerator:
    def __init__(self):
        self.storage_path = Path("storage")
        self.templates_path = Path("templates")
        self.storage_path.mkdir(exist_ok=True)
        
        # Setup Jinja2 environment
        self.jinja_env = Environment(
            loader=FileSystemLoader(str(self.templates_path)),
            autoescape=True
        )
    
    def get_pwa_path(self, pwa_subdomain: str) -> Path:
        """Get the path for a PWA"""
        return self.storage_path / pwa_subdomain
    
    async def generate_pwa(self, provider_data: Dict[str, Any], pwa_config: Optional[Dict[str, Any]] = None, pwa_type: str = "basic") -> str:
        """Generate PWA for an organization"""
        pwa_subdomain = provider_data.get("pwa_subdomain")
        if not pwa_subdomain:
            raise ValueError("Organization must have a pwa_subdomain")
        
        pwa_path = self.get_pwa_path(pwa_subdomain)
        
        # Create PWA directory
        pwa_path.mkdir(exist_ok=True)
        
        # Generate PWA files based on type
        await self._generate_manifest(pwa_path, provider_data, pwa_config)
        
        if pwa_type == "client":
            await self._generate_client_pwa(pwa_path, provider_data, pwa_config)
        else:
            await self._generate_basic_pwa(pwa_path, provider_data, pwa_config)
        
        return f"/pwa/{pwa_subdomain}"
    
    async def _generate_manifest(self, pwa_path: Path, provider_data: Dict[str, Any], pwa_config: Optional[Dict[str, Any]] = None):
        """Generate PWA manifest.json"""
        manifest_data = {
            "name": pwa_config.get("app_name", provider_data.get("business_name", "WaitLessQ")) if pwa_config else provider_data.get("business_name", "WaitLessQ"),
            "short_name": provider_data.get("business_name", "WaitLessQ")[:12],
            "description": pwa_config.get("app_description", provider_data.get("business_description", "")) if pwa_config else provider_data.get("business_description", ""),
            "start_url": f"/pwa/{provider_data.get('pwa_subdomain')}/",
            "scope": f"/pwa/{provider_data.get('pwa_subdomain')}/",
            "display": pwa_config.get("display_mode", "standalone") if pwa_config else "standalone",
            "orientation": pwa_config.get("orientation", "portrait") if pwa_config else "portrait",
            "theme_color": pwa_config.get("theme_color", provider_data.get("primary_color", "#3B82F6")) if pwa_config else provider_data.get("primary_color", "#3B82F6"),
            "background_color": pwa_config.get("background_color", "#FFFFFF") if pwa_config else "#FFFFFF",
            "icons": self._generate_icon_list(provider_data, pwa_config)
        }
        
        with open(pwa_path / "manifest.json", "w") as f:
            json.dump(manifest_data, f, indent=2)
    
    def _generate_icon_list(self, provider_data: Dict[str, Any], pwa_config: Optional[Dict[str, Any]] = None):
        """Generate icon list for manifest"""
        icons = []
        
        # Use custom icon if provided
        if pwa_config and pwa_config.get("icon_url"):
            icon_url = pwa_config["icon_url"]
            
            # Detect icon type from URL
            icon_type = "image/png"  # default
            if icon_url.lower().endswith('.ico'):
                icon_type = "image/x-icon"
            elif icon_url.lower().endswith('.jpg') or icon_url.lower().endswith('.jpeg'):
                icon_type = "image/jpeg"
            elif icon_url.lower().endswith('.svg'):
                icon_type = "image/svg+xml"
            
            icons.extend([
                {
                    "src": icon_url,
                    "sizes": "192x192",
                    "type": icon_type,
                    "purpose": "any maskable"
                },
                {
                    "src": icon_url,
                    "sizes": "512x512",
                    "type": icon_type,
                    "purpose": "any maskable"
                }
            ])
        
        # Fallback to generated SVG icons
        theme_color = (pwa_config.get("theme_color", provider_data.get("primary_color", "#3B82F6")) if pwa_config else provider_data.get("primary_color", "#3B82F6")).lstrip('#')
        
        icons.extend([
            {
                "src": f"data:image/svg+xml,<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 192 192'><rect width='192' height='192' fill='%23{theme_color}' rx='24'/><text x='96' y='120' font-size='80' text-anchor='middle' fill='white'>📱</text></svg>",
                "sizes": "192x192",
                "type": "image/svg+xml"
            },
            {
                "src": f"data:image/svg+xml,<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 512 512'><rect width='512' height='512' fill='%23{theme_color}' rx='64'/><text x='256' y='320' font-size='200' text-anchor='middle' fill='white'>📱</text></svg>",
                "sizes": "512x512",
                "type": "image/svg+xml"
            }
        ])
        
        return icons
    
    async def _generate_index_html(self, pwa_path: Path, provider_data: Dict[str, Any], pwa_config: Optional[Dict[str, Any]] = None):
        """Generate main HTML file"""
        template = self.jinja_env.get_template("index.html")
        
        context = {
            "provider": provider_data,
            "pwa_config": pwa_config or {},
            "app_name": pwa_config.get("app_name", provider_data.get("business_name", "WaitLessQ")) if pwa_config else provider_data.get("business_name", "WaitLessQ"),
            "primary_color": pwa_config.get("primary_color", provider_data.get("primary_color", "#3B82F6")) if pwa_config else provider_data.get("primary_color", "#3B82F6"),
            "secondary_color": pwa_config.get("secondary_color", provider_data.get("secondary_color", "#1F2937")) if pwa_config else provider_data.get("secondary_color", "#1F2937"),
            "welcome_message": pwa_config.get("welcome_message", "Welcome! Book your appointment with us.") if pwa_config else "Welcome! Book your appointment with us.",
            "enable_appointments": pwa_config.get("enable_appointments", True) if pwa_config else True,
            "enable_queue": pwa_config.get("enable_queue", True) if pwa_config else True,
            "enable_notifications": pwa_config.get("enable_notifications", True) if pwa_config else True,
        }
        
        html_content = template.render(**context)
        
        with open(pwa_path / "index.html", "w") as f:
            f.write(html_content)
    
    async def _generate_service_worker(self, pwa_path: Path, provider_data: Dict[str, Any], pwa_config: Optional[Dict[str, Any]] = None):
        """Generate service worker for offline functionality"""
        template = self.jinja_env.get_template("sw.js")
        
        # Generate cache version based on current timestamp
        import time
        cache_version = str(int(time.time()))
        
        context = {
            "provider_id": provider_data.get("id"),
            "cache_name": f"waitlessq-{provider_data.get('id')}",
            "cache_version": cache_version,
            "app_name": pwa_config.get("app_name", provider_data.get("business_name", "WaitLessQ")) if pwa_config else provider_data.get("business_name", "WaitLessQ")
        }
        
        sw_content = template.render(**context)
        
        with open(pwa_path / "sw.js", "w") as f:
            f.write(sw_content)
    
    async def _generate_service_worker_with_version(self, pwa_path: Path, provider_data: Dict[str, Any], pwa_config: Optional[Dict[str, Any]] = None, cache_version: str = None):
        """Generate service worker with specific cache version"""
        template = self.jinja_env.get_template("sw.js")
        
        if cache_version is None:
            import time
            cache_version = str(int(time.time()))
        
        context = {
            "provider_id": provider_data.get("id"),
            "cache_name": f"waitlessq-{provider_data.get('id')}",
            "cache_version": cache_version,
            "app_name": pwa_config.get("app_name", provider_data.get("business_name", "WaitLessQ")) if pwa_config else provider_data.get("business_name", "WaitLessQ")
        }
        
        sw_content = template.render(**context)
        
        with open(pwa_path / "sw.js", "w") as f:
            f.write(sw_content)
    
    async def _generate_basic_pwa(self, pwa_path: Path, provider_data: Dict[str, Any], pwa_config: Optional[Dict[str, Any]] = None):
        """Generate basic PWA (original functionality)"""
        await self._generate_index_html(pwa_path, provider_data, pwa_config)
        await self._generate_styles(pwa_path, provider_data, pwa_config)
        await self._generate_scripts(pwa_path, provider_data, pwa_config)
        await self._generate_service_worker(pwa_path, provider_data, pwa_config)
    
    async def _generate_client_pwa(self, pwa_path: Path, provider_data: Dict[str, Any], pwa_config: Optional[Dict[str, Any]] = None):
        """Generate client-facing PWA with authentication and appointment management"""
        # Generate cache version once for all files
        import time
        cache_version = str(int(time.time()))
        
        await self._generate_client_html(pwa_path, provider_data, pwa_config, cache_version)
        await self._generate_client_styles(pwa_path, provider_data, pwa_config)
        await self._generate_client_scripts(pwa_path, provider_data, pwa_config)
        
        # Generate service worker with same cache version
        await self._generate_service_worker_with_version(pwa_path, provider_data, pwa_config, cache_version)
    
    async def _generate_client_html(self, pwa_path: Path, provider_data: Dict[str, Any], pwa_config: Optional[Dict[str, Any]] = None, cache_version: str = None):
        """Generate client PWA HTML"""
        template = self.jinja_env.get_template("client-pwa.html")
        
        # Use provided cache version or generate new one
        if cache_version is None:
            import time
            cache_version = str(int(time.time()))
        
        # Parse features and branding if they're JSON strings
        features = {}
        branding = {}
        if pwa_config:
            if isinstance(pwa_config.get("features"), str):
                try:
                    features = json.loads(pwa_config["features"])
                except (json.JSONDecodeError, TypeError):
                    features = {}
            elif isinstance(pwa_config.get("features"), dict):
                features = pwa_config["features"]
            
            if isinstance(pwa_config.get("branding"), str):
                try:
                    branding = json.loads(pwa_config["branding"])
                except (json.JSONDecodeError, TypeError):
                    branding = {}
            elif isinstance(pwa_config.get("branding"), dict):
                branding = pwa_config["branding"]
        
        context = {
            "provider": provider_data,
            "pwa_config": pwa_config or {},
            "app_name": pwa_config.get("app_name", provider_data.get("business_name", "WaitLessQ")) if pwa_config else provider_data.get("business_name", "WaitLessQ"),
            "app_short_name": pwa_config.get("app_short_name", "") if pwa_config else "",
            "app_description": pwa_config.get("app_description", "") if pwa_config else "",
            
            # Colors
            "theme_color": pwa_config.get("theme_color", provider_data.get("primary_color", "#3B82F6")) if pwa_config else provider_data.get("primary_color", "#3B82F6"),
            "accent_color": pwa_config.get("accent_color", "#F59E0B") if pwa_config else "#F59E0B",
            "background_color": pwa_config.get("background_color", "#FFFFFF") if pwa_config else "#FFFFFF",
            "primary_color": pwa_config.get("primary_color", provider_data.get("primary_color", "#3B82F6")) if pwa_config else provider_data.get("primary_color", "#3B82F6"),
            "secondary_color": pwa_config.get("secondary_color", provider_data.get("secondary_color", "#1F2937")) if pwa_config else provider_data.get("secondary_color", "#1F2937"),
            "success_color": pwa_config.get("success_color", "#10b981") if pwa_config else "#10b981",
            "warning_color": pwa_config.get("warning_color", "#f59e0b") if pwa_config else "#f59e0b",
            "error_color": pwa_config.get("error_color", "#ef4444") if pwa_config else "#ef4444",
            
            # Typography
            "font_family": pwa_config.get("font_family", "Inter") if pwa_config else "Inter",
            "font_size_base": pwa_config.get("font_size_base", 16) if pwa_config else 16,
            "font_weight_normal": pwa_config.get("font_weight_normal", 400) if pwa_config else 400,
            "font_weight_bold": pwa_config.get("font_weight_bold", 600) if pwa_config else 600,
            
            # Layout
            "border_radius": pwa_config.get("border_radius", 12) if pwa_config else 12,
            "card_shadow": pwa_config.get("card_shadow", "medium") if pwa_config else "medium",
            "layout_style": pwa_config.get("layout_style", "modern") if pwa_config else "modern",
            "navigation_style": pwa_config.get("navigation_style", "bottom") if pwa_config else "bottom",
            
            # Images
            "logo_url": (pwa_config.get("logo_url") or pwa_config.get("icon_url")) if pwa_config else None,
            "icon_url": pwa_config.get("icon_url", "") if pwa_config else "",
            "favicon_url": pwa_config.get("favicon_url", "") if pwa_config else "",
            "splash_image": pwa_config.get("splash_image", "") if pwa_config else "",
            "background_image": pwa_config.get("background_image", "") if pwa_config else "",
            
            # Content
            "welcome_message": pwa_config.get("welcome_message", "Welcome to your appointment portal") if pwa_config else "Welcome to your appointment portal",
            "welcome_subtitle": pwa_config.get("welcome_subtitle", "") if pwa_config else "",
            "footer_text": pwa_config.get("footer_text", "") if pwa_config else "",
            "contact_info": pwa_config.get("contact_info", "") if pwa_config else "",
            "privacy_policy_url": pwa_config.get("privacy_policy_url", "") if pwa_config else "",
            "terms_of_service_url": pwa_config.get("terms_of_service_url", "") if pwa_config else "",
            
            # Features
            "features": features,
            "branding": branding,
            
            # Show/hide elements
            "show_logo": pwa_config.get("show_logo", True) if pwa_config else True,
            "show_company_name": pwa_config.get("show_company_name", True) if pwa_config else True,
            
            # Technical
            "organization_id": provider_data.get("organization_id", 1),
            "api_url": os.getenv("BACKEND_BASE_URL", os.getenv("BACKEND_URL", "http://localhost:8000")),
            "cache_version": cache_version,
        }
        
        html_content = template.render(**context)
        
        with open(pwa_path / "index.html", "w") as f:
            f.write(html_content)
    
    async def _generate_client_styles(self, pwa_path: Path, provider_data: Dict[str, Any], pwa_config: Optional[Dict[str, Any]] = None):
        """Generate client PWA CSS"""
        template = self.jinja_env.get_template("client-styles.css")
        
        # Parse features and branding if they're JSON strings
        features = {}
        branding = {}
        if pwa_config:
            if isinstance(pwa_config.get("features"), str):
                try:
                    features = json.loads(pwa_config["features"])
                except (json.JSONDecodeError, TypeError):
                    features = {}
            elif isinstance(pwa_config.get("features"), dict):
                features = pwa_config["features"]
            
            if isinstance(pwa_config.get("branding"), str):
                try:
                    branding = json.loads(pwa_config["branding"])
                except (json.JSONDecodeError, TypeError):
                    branding = {}
            elif isinstance(pwa_config.get("branding"), dict):
                branding = pwa_config["branding"]
        
        context = {
            # Colors
            "theme_color": pwa_config.get("theme_color", provider_data.get("primary_color", "#3B82F6")) if pwa_config else provider_data.get("primary_color", "#3B82F6"),
            "accent_color": pwa_config.get("accent_color", "#F59E0B") if pwa_config else "#F59E0B",
            "background_color": pwa_config.get("background_color", "#FFFFFF") if pwa_config else "#FFFFFF",
            "primary_color": pwa_config.get("primary_color", provider_data.get("primary_color", "#3B82F6")) if pwa_config else provider_data.get("primary_color", "#3B82F6"),
            "secondary_color": pwa_config.get("secondary_color", provider_data.get("secondary_color", "#1F2937")) if pwa_config else provider_data.get("secondary_color", "#1F2937"),
            "success_color": pwa_config.get("success_color", "#10b981") if pwa_config else "#10b981",
            "warning_color": pwa_config.get("warning_color", "#f59e0b") if pwa_config else "#f59e0b",
            "error_color": pwa_config.get("error_color", "#ef4444") if pwa_config else "#ef4444",
            
            # Typography
            "font_family": pwa_config.get("font_family", "Inter") if pwa_config else "Inter",
            "font_size_base": pwa_config.get("font_size_base", 16) if pwa_config else 16,
            "font_weight_normal": pwa_config.get("font_weight_normal", 400) if pwa_config else 400,
            "font_weight_bold": pwa_config.get("font_weight_bold", 600) if pwa_config else 600,
            
            # Layout
            "border_radius": pwa_config.get("border_radius", 12) if pwa_config else 12,
            "card_shadow": pwa_config.get("card_shadow", "medium") if pwa_config else "medium",
            "layout_style": pwa_config.get("layout_style", "modern") if pwa_config else "modern",
            "navigation_style": pwa_config.get("navigation_style", "bottom") if pwa_config else "bottom",
            
            # Content
            "welcome_message": pwa_config.get("welcome_message", "Welcome to your appointment portal") if pwa_config else "Welcome to your appointment portal",
            "welcome_subtitle": pwa_config.get("welcome_subtitle", "") if pwa_config else "",
            "footer_text": pwa_config.get("footer_text", "") if pwa_config else "",
            "contact_info": pwa_config.get("contact_info", "") if pwa_config else "",
            
            # Features
            "features": features,
            "branding": branding,
            
            # Show/hide elements
            "show_logo": pwa_config.get("show_logo", True) if pwa_config else True,
            "show_company_name": pwa_config.get("show_company_name", True) if pwa_config else True,
        }
        
        css_content = template.render(**context)
        
        with open(pwa_path / "client-styles.css", "w") as f:
            f.write(css_content)
    
    async def _generate_client_scripts(self, pwa_path: Path, provider_data: Dict[str, Any], pwa_config: Optional[Dict[str, Any]] = None):
        """Generate client PWA JavaScript"""
        template = self.jinja_env.get_template("client-app.js")
        
        # Client PWA uses static template, no dynamic content needed
        js_content = template.render()
        
        with open(pwa_path / "client-app.js", "w") as f:
            f.write(js_content)
    
    async def _generate_styles(self, pwa_path: Path, provider_data: Dict[str, Any], pwa_config: Optional[Dict[str, Any]] = None):
        """Generate CSS styles for basic PWA"""
        template = self.jinja_env.get_template("styles.css")
        
        context = {
            "primary_color": pwa_config.get("theme_color", provider_data.get("primary_color", "#3B82F6")) if pwa_config else provider_data.get("primary_color", "#3B82F6"),
            "secondary_color": pwa_config.get("secondary_color", provider_data.get("secondary_color", "#1F2937")) if pwa_config else provider_data.get("secondary_color", "#1F2937"),
            "accent_color": pwa_config.get("accent_color", "#F59E0B") if pwa_config else "#F59E0B",
            "background_color": pwa_config.get("background_color", "#FFFFFF") if pwa_config else "#FFFFFF",
            "text_color": pwa_config.get("text_color", "#1F2937") if pwa_config else "#1F2937",
        }
        
        css_content = template.render(**context)
        
        with open(pwa_path / "styles.css", "w") as f:
            f.write(css_content)
    
    async def _generate_scripts(self, pwa_path: Path, provider_data: Dict[str, Any], pwa_config: Optional[Dict[str, Any]] = None):
        """Generate JavaScript files for basic PWA"""
        template = self.jinja_env.get_template("app.js")
        
        context = {
            "provider_id": provider_data.get("id"),
            "provider_name": provider_data.get("business_name"),
            "api_url": os.getenv("BACKEND_BASE_URL", os.getenv("BACKEND_URL", "http://localhost:8000")),
            "enable_appointments": pwa_config.get("enable_appointments", True) if pwa_config else True,
            "enable_queue": pwa_config.get("enable_queue", True) if pwa_config else True,
            "enable_notifications": pwa_config.get("enable_notifications", True) if pwa_config else True,
        }
        
        js_content = template.render(**context)
        
        with open(pwa_path / "app.js", "w") as f:
            f.write(js_content) 