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
    
    def get_pwa_path(self, provider_subdomain: str) -> Path:
        """Get the path for a provider's PWA"""
        return self.storage_path / provider_subdomain
    
    async def generate_pwa(self, provider_data: Dict[str, Any], pwa_config: Optional[Dict[str, Any]] = None) -> str:
        """Generate PWA for a provider"""
        provider_subdomain = provider_data.get("pwa_subdomain")
        if not provider_subdomain:
            raise ValueError("Provider must have a pwa_subdomain")
        
        pwa_path = self.get_pwa_path(provider_subdomain)
        
        # Create PWA directory
        pwa_path.mkdir(exist_ok=True)
        
        # Generate PWA files
        await self._generate_manifest(pwa_path, provider_data, pwa_config)
        await self._generate_index_html(pwa_path, provider_data, pwa_config)
        await self._generate_service_worker(pwa_path, provider_data)
        await self._generate_styles(pwa_path, provider_data, pwa_config)
        await self._generate_scripts(pwa_path, provider_data, pwa_config)
        
        return f"/pwa/{provider_subdomain}"
    
    async def _generate_manifest(self, pwa_path: Path, provider_data: Dict[str, Any], pwa_config: Optional[Dict[str, Any]] = None):
        """Generate PWA manifest.json"""
        manifest_data = {
            "name": pwa_config.get("app_name", provider_data.get("business_name", "WaitLessQ")) if pwa_config else provider_data.get("business_name", "WaitLessQ"),
            "short_name": provider_data.get("business_name", "WaitLessQ")[:12],
            "description": pwa_config.get("app_description", provider_data.get("business_description", "")) if pwa_config else provider_data.get("business_description", ""),
            "start_url": "/",
            "display": pwa_config.get("display_mode", "standalone") if pwa_config else "standalone",
            "orientation": pwa_config.get("orientation", "portrait") if pwa_config else "portrait",
            "theme_color": pwa_config.get("theme_color", provider_data.get("primary_color", "#3B82F6")) if pwa_config else provider_data.get("primary_color", "#3B82F6"),
            "background_color": pwa_config.get("background_color", "#FFFFFF") if pwa_config else "#FFFFFF",
            "icons": [
                {
                    "src": pwa_config.get("icon_192", "/static/icons/icon-192.png") if pwa_config else "/static/icons/icon-192.png",
                    "sizes": "192x192",
                    "type": "image/png"
                },
                {
                    "src": pwa_config.get("icon_512", "/static/icons/icon-512.png") if pwa_config else "/static/icons/icon-512.png",
                    "sizes": "512x512",
                    "type": "image/png"
                }
            ]
        }
        
        with open(pwa_path / "manifest.json", "w") as f:
            json.dump(manifest_data, f, indent=2)
    
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
    
    async def _generate_service_worker(self, pwa_path: Path, provider_data: Dict[str, Any]):
        """Generate service worker for offline functionality"""
        template = self.jinja_env.get_template("sw.js")
        
        context = {
            "provider_id": provider_data.get("id"),
            "cache_name": f"waitlessq-{provider_data.get('id')}-v1"
        }
        
        sw_content = template.render(**context)
        
        with open(pwa_path / "sw.js", "w") as f:
            f.write(sw_content)
    
    async def _generate_styles(self, pwa_path: Path, provider_data: Dict[str, Any], pwa_config: Optional[Dict[str, Any]] = None):
        """Generate CSS styles"""
        template = self.jinja_env.get_template("styles.css")
        
        context = {
            "primary_color": pwa_config.get("primary_color", provider_data.get("primary_color", "#3B82F6")) if pwa_config else provider_data.get("primary_color", "#3B82F6"),
            "secondary_color": pwa_config.get("secondary_color", provider_data.get("secondary_color", "#1F2937")) if pwa_config else provider_data.get("secondary_color", "#1F2937"),
            "accent_color": pwa_config.get("accent_color", "#F59E0B") if pwa_config else "#F59E0B",
            "background_color": pwa_config.get("background_color", "#FFFFFF") if pwa_config else "#FFFFFF",
            "text_color": pwa_config.get("text_color", "#1F2937") if pwa_config else "#1F2937",
        }
        
        css_content = template.render(**context)
        
        with open(pwa_path / "styles.css", "w") as f:
            f.write(css_content)
    
    async def _generate_scripts(self, pwa_path: Path, provider_data: Dict[str, Any], pwa_config: Optional[Dict[str, Any]] = None):
        """Generate JavaScript files"""
        template = self.jinja_env.get_template("app.js")
        
        context = {
            "provider_id": provider_data.get("id"),
            "provider_name": provider_data.get("business_name"),
            "api_url": os.getenv("BACKEND_URL", "http://localhost:8000"),
            "enable_appointments": pwa_config.get("enable_appointments", True) if pwa_config else True,
            "enable_queue": pwa_config.get("enable_queue", True) if pwa_config else True,
            "enable_notifications": pwa_config.get("enable_notifications", True) if pwa_config else True,
        }
        
        js_content = template.render(**context)
        
        with open(pwa_path / "app.js", "w") as f:
            f.write(js_content) 