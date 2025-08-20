import React, { useState, useEffect } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { motion } from 'framer-motion'
import { toast } from 'sonner'
import { useTranslation } from 'react-i18next'
import { useRTL } from '../../hooks/useRTL'
import { 
  Settings as SettingsIcon,
  Smartphone,
  Palette,
  Globe,
  Shield,
  Bell,
  Eye,
  Download,
  RefreshCw,
  Save,
  ExternalLink,
  Copy,
  Check,
  CheckCircle,
  Upload,
  ImageIcon
} from 'lucide-react'

import { Button } from '../ui/button'
import { Input } from '../ui/input'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../ui/card'
import { api } from '../../lib/api-client'

// Types for PWA Configuration
interface PWAConfig {
  id?: number
  organization_id?: number
  app_name: string
  app_short_name: string
  app_description: string
  theme_color: string
  background_color: string
  accent_color: string
  logo_url?: string
  icon_url?: string
  icon_192_url?: string
  icon_512_url?: string
  start_url: string
  display: 'standalone' | 'fullscreen' | 'minimal-ui' | 'browser'
  orientation: 'any' | 'portrait' | 'landscape'
  is_active: boolean
  custom_css?: string
  custom_js?: string
  font_family?: string
  font_size_base?: number
  border_radius?: number
  layout_style?: string
  card_shadow?: string
  cache_strategy?: string
  default_language?: string
  offline_message?: string
  google_analytics_id?: string
  google_tag_manager_id?: string
  facebook_pixel_id?: string
  hotjar_site_id?: string
  intercom_app_id?: string
  features: {
    notifications: boolean
    offline_mode: boolean
    location_access: boolean
    camera_access: boolean
    [key: string]: boolean // Allow dynamic access
  }
  branding: {
    show_logo: boolean
    show_company_name: boolean
    footer_text?: string
    contact_info?: string
  }
  created_at?: string
  updated_at?: string
}



export function Settings() {
  const { t } = useTranslation()
  const { isRTL, getFlexDirection, getMargin } = useRTL()
  const [activeTab, setActiveTab] = useState<'pwa' | 'design' | 'features' | 'advanced' | 'analytics'>('pwa')
  const [showPreview, setShowPreview] = useState(false)
  const [pwaGenerationResult, setPwaGenerationResult] = useState<any>(null)
  const [copied, setCopied] = useState(false)
  const [subdomainStatus, setSubdomainStatus] = useState<{
    checking: boolean
    available: boolean | null
    message: string
    generatedSubdomain: string | null
  }>({
    checking: false,
    available: null,
    message: '',
    generatedSubdomain: null
  })
  
  const queryClient = useQueryClient()

  // Function to check subdomain availability
  const checkSubdomainAvailability = async (appName: string) => {
    if (!appName.trim()) {
      setSubdomainStatus({
        checking: false,
        available: null,
        message: '',
        generatedSubdomain: null
      })
      return
    }

    setSubdomainStatus(prev => ({ ...prev, checking: true }))
    
    try {
      const result = await api.pwa.checkSubdomain(appName)
      setSubdomainStatus({
        checking: false,
        available: result.available,
        message: result.message,
        generatedSubdomain: result.generated_subdomain
      })
    } catch (error) {
      console.error('Error checking subdomain:', error)
      setSubdomainStatus({
        checking: false,
        available: false,
        message: 'Error checking subdomain availability',
        generatedSubdomain: null
      })
    }
  }



  // Default PWA configuration
  const [pwaConfig, setPwaConfig] = useState<PWAConfig>({
    app_name: '',
    app_short_name: '',
    app_description: '',
    theme_color: '#6366f1',
    background_color: '#ffffff',
    accent_color: '#8b5cf6',
    icon_url: '',
    start_url: '/',
    display: 'standalone',
    orientation: 'any',
    is_active: true,
    features: {
      notifications: true,
      offline_mode: true,
      location_access: false,
      camera_access: false,
    },
    branding: {
      show_logo: true,
      show_company_name: true,
      footer_text: '',
      contact_info: '',
    }
  })

  // Fetch current PWA configuration
  const { data: configData } = useQuery({
    queryKey: ['pwa-config'],
    queryFn: () => api.pwa.getConfig()
  })

  // Update state when config data is loaded
  useEffect(() => {
    if (configData) {
      setPwaConfig(prev => ({
        ...prev,
        ...configData,
        // Ensure features and branding are objects, not null
        features: configData.features || prev.features,
        branding: configData.branding || prev.branding
      }))
      // Reset subdomain status when loading existing config
      setSubdomainStatus({
        checking: false,
        available: null,
        message: '',
        generatedSubdomain: null
      })
    }
  }, [configData])

  // Debounced subdomain check
  useEffect(() => {
    const timeoutId = setTimeout(() => {
      if (pwaConfig.app_name) {
        checkSubdomainAvailability(pwaConfig.app_name)
      }
    }, 500) // 500ms delay

    return () => clearTimeout(timeoutId)
  }, [pwaConfig.app_name])

  // Save PWA configuration mutation
  const savePWAConfigMutation = useMutation({
    mutationFn: (config: PWAConfig) => {
      console.log('🔧 Mutation triggered, sending config:', config)
      return api.pwa.saveConfig(config)
    },
    onSuccess: (data) => {
      console.log('🔧 Save successful, response:', data)
      toast.success(t('success.saved'))
      queryClient.invalidateQueries({ queryKey: ['pwa-config'] })
    },
    onError: (error: any) => {
      console.error('PWA save error:', error)
      let errorMessage = t('errors.generic')
      
      if (error.response?.data?.detail) {
        const detail = error.response.data.detail
        if (Array.isArray(detail)) {
          // Handle validation errors from backend
          errorMessage = detail.map((err: any) => 
            typeof err === 'object' && err.msg ? err.msg : String(err)
          ).join(', ')
        } else if (typeof detail === 'string') {
          errorMessage = detail
        } else {
          errorMessage = 'Validation error occurred'
        }
      }
      
      toast.error(errorMessage)
    }
  })

  // Generate PWA mutation
  const generatePWAMutation = useMutation({
    mutationFn: () => api.pwa.generatePWA(),
    onSuccess: (data) => {
      setPwaGenerationResult(data)
      // URLs will now show directly in the preview box
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.detail || 'Failed to generate PWA')
    }
  })

  const handleSave = () => {
    console.log('🔧 Save button clicked, config to save:', pwaConfig)
    
    // Check if app name is valid and subdomain is available
    if (Boolean(pwaConfig.app_name) && subdomainStatus.available === false) {
      toast.error(t('settings.pwaConfig.subdomainCheck.cannotSave', { message: subdomainStatus.message }))
      return
    }
    
    if (Boolean(pwaConfig.app_name) && subdomainStatus.checking) {
      toast.error(t('settings.pwaConfig.subdomainCheck.waitForCheck'))
      return
    }
    
    savePWAConfigMutation.mutate(pwaConfig)
  }

  const handleGenerate = () => {
    generatePWAMutation.mutate()
  }

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text)
    setCopied(true)
    toast.success('Copied to clipboard!')
    setTimeout(() => setCopied(false), 2000)
  }

  const tabs = [
    { id: 'pwa', label: 'PWA Settings', icon: Smartphone },
    { id: 'design', label: 'Design & Branding', icon: Palette },
    { id: 'features', label: 'Features', icon: Shield },
    { id: 'advanced', label: 'Advanced', icon: SettingsIcon },
    { id: 'analytics', label: 'Analytics', icon: Bell },
  ]

  return (
    <div className="container mx-auto p-6 space-y-8">
      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="space-y-4"
      >
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-4xl font-bold tracking-tight bg-gradient-to-r from-primary to-primary/80 bg-clip-text text-transparent">
              {t('settings.title')}
            </h1>
            <p className="text-lg text-muted-foreground">
              {t('settings.pwaConfig.subtitle')}
            </p>
          </div>
          
          <div className="flex gap-2">
            <Button
              onClick={handleSave}
              disabled={
                savePWAConfigMutation.isPending || 
                subdomainStatus.checking ||
                (Boolean(pwaConfig.app_name) && subdomainStatus.available === false)
              }
              className="shadow-lg hover:shadow-xl transition-all duration-300 bg-gradient-to-r from-primary to-primary/90 hover:from-primary/90 hover:to-primary"
            >
              {savePWAConfigMutation.isPending ? (
                <>
                  <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                  {t('settings.pwaConfig.saving')}
                </>
              ) : (
                <>
                  <Save className="h-4 w-4 mr-2" />
                  {t('common.save')}
                </>
              )}
            </Button>
            
            <Button
              onClick={handleGenerate}
              disabled={generatePWAMutation.isPending}
              variant="outline"
              className="shadow-lg hover:shadow-xl transition-all duration-300"
            >
              {generatePWAMutation.isPending ? (
                <>
                  <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                  Generating...
                </>
              ) : (
                <>
                  <Download className="h-4 w-4 mr-2" />
                  Generate PWA
                </>
              )}
            </Button>
          </div>
        </div>



        {/* Tab Navigation */}
        <div className="border-b border-muted">
          <nav className="flex space-x-8">
            {tabs.map((tab) => {
              const Icon = tab.icon
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id as any)}
                  className={`py-4 px-1 border-b-2 font-medium text-sm transition-colors duration-200 flex items-center gap-2 ${
                    activeTab === tab.id
                      ? 'border-primary text-primary'
                      : 'border-transparent text-muted-foreground hover:text-foreground hover:border-muted-foreground'
                  }`}
                >
                  <Icon className="h-4 w-4" />
                  {tab.label}
                </button>
              )
            })}
          </nav>
        </div>
      </motion.div>

      {/* Tab Content */}
      <motion.div
        key={activeTab}
        initial={{ opacity: 0, x: 20 }}
        animate={{ opacity: 1, x: 0 }}
        transition={{ duration: 0.3 }}
        className="space-y-6"
      >
        {/* PWA Settings Tab */}
        {activeTab === 'pwa' && (
          <div className="grid gap-6 lg:grid-cols-2">
            {/* Basic Information */}
            <Card className="card-hover">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Smartphone className="h-5 w-5" />
                  {t('settings.pwaConfig.appInfo')}
                </CardTitle>
                <CardDescription>
                  {t('settings.pwaConfig.appInfoDesc')}
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <label className="text-sm font-medium mb-2 block">{t('settings.pwaConfig.appName')}</label>
                  <div className="relative">
                    <Input
                      value={pwaConfig.app_name}
                      onChange={(e) => setPwaConfig({ ...pwaConfig, app_name: e.target.value })}
                      placeholder="My Business App"
                      className={`input-focus pr-10 ${
                        subdomainStatus.available === false ? 'border-red-500 focus:border-red-500' : 
                        subdomainStatus.available === true ? 'border-green-500 focus:border-green-500' : ''
                      }`}
                    />
                    {subdomainStatus.checking && (
                      <RefreshCw className="absolute right-3 top-1/2 transform -translate-y-1/2 h-4 w-4 animate-spin text-muted-foreground" />
                    )}
                    {!subdomainStatus.checking && subdomainStatus.available === true && (
                      <CheckCircle className="absolute right-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-green-500" />
                    )}
                    {!subdomainStatus.checking && subdomainStatus.available === false && Boolean(pwaConfig.app_name) && (
                      <div className="absolute right-3 top-1/2 transform -translate-y-1/2 h-4 w-4 rounded-full bg-red-500 flex items-center justify-center">
                        <span className="text-white text-xs font-bold">!</span>
                      </div>
                    )}
                  </div>
                  {subdomainStatus.generatedSubdomain && (
                    <div className="mt-2 space-y-1">
                      <p className="text-xs text-muted-foreground">
                        {t('settings.pwaConfig.subdomainCheck.url', { 
                          url: `${subdomainStatus.generatedSubdomain}.waitlessq.com` 
                        })}
                      </p>
                      <p className={`text-xs ${
                        subdomainStatus.available === true ? 'text-green-600' : 'text-red-600'
                      }`}>
                        {subdomainStatus.available === true && '✅ '}
                        {subdomainStatus.available === false && '❌ '}
                        {subdomainStatus.message}
                      </p>
                    </div>
                  )}
                </div>
                
                <div>
                  <label className="text-sm font-medium mb-2 block">{t('settings.pwaConfig.shortName')}</label>
                  <Input
                    value={pwaConfig.app_short_name}
                    onChange={(e) => setPwaConfig({ ...pwaConfig, app_short_name: e.target.value })}
                    placeholder="MyApp"
                    className="input-focus"
                    maxLength={12}
                  />
                  <p className="text-xs text-muted-foreground mt-1">{t('settings.pwaConfig.shortNameDesc')}</p>
                </div>
                
                <div>
                  <label className="text-sm font-medium mb-2 block">{t('settings.pwaConfig.description')}</label>
                  <textarea
                    value={pwaConfig.app_description}
                    onChange={(e) => setPwaConfig({ ...pwaConfig, app_description: e.target.value })}
                    placeholder="A convenient app for managing appointments..."
                    className="w-full px-3 py-2 border border-muted rounded-lg focus:border-primary/50 focus:outline-none focus:ring-2 focus:ring-primary/20 transition-all duration-300"
                    rows={3}
                  />
                </div>
              </CardContent>
            </Card>

            {/* Appearance */}
            <Card className="card-hover">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Palette className="h-5 w-5" />
                  Appearance
                </CardTitle>
                <CardDescription>
                  Customize colors and branding for your PWA
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="text-sm font-medium mb-2 block">Theme Color</label>
                    <div className="flex gap-2">
                      <Input
                        type="color"
                        value={pwaConfig.theme_color}
                        onChange={(e) => setPwaConfig({ ...pwaConfig, theme_color: e.target.value })}
                        className="w-16 h-10 p-1 border rounded"
                      />
                      <Input
                        value={pwaConfig.theme_color}
                        onChange={(e) => setPwaConfig({ ...pwaConfig, theme_color: e.target.value })}
                        placeholder="#6366f1"
                        className="flex-1 input-focus"
                      />
                    </div>
                  </div>
                  
                  <div>
                    <label className="text-sm font-medium mb-2 block">Background Color</label>
                    <div className="flex gap-2">
                      <Input
                        type="color"
                        value={pwaConfig.background_color}
                        onChange={(e) => setPwaConfig({ ...pwaConfig, background_color: e.target.value })}
                        className="w-16 h-10 p-1 border rounded"
                      />
                      <Input
                        value={pwaConfig.background_color}
                        onChange={(e) => setPwaConfig({ ...pwaConfig, background_color: e.target.value })}
                        placeholder="#ffffff"
                        className="flex-1 input-focus"
                      />
                    </div>
                  </div>
                </div>
                
                <div>
                  <label className="text-sm font-medium mb-2 block">Accent Color</label>
                  <div className="flex gap-2">
                    <Input
                      type="color"
                      value={pwaConfig.accent_color}
                      onChange={(e) => setPwaConfig({ ...pwaConfig, accent_color: e.target.value })}
                      className="w-16 h-10 p-1 border rounded"
                    />
                    <Input
                      value={pwaConfig.accent_color}
                      onChange={(e) => setPwaConfig({ ...pwaConfig, accent_color: e.target.value })}
                      placeholder="#8b5cf6"
                      className="flex-1 input-focus"
                    />
                  </div>
                </div>
                
                {/* Icon Upload Section */}
                <div>
                  <label className="text-sm font-medium mb-2 block">PWA Icon</label>
                  <div className="flex items-center gap-4 p-4 border-2 border-dashed border-muted-foreground/25 rounded-lg">
                    <div className="flex-shrink-0">
                      {pwaConfig.icon_url ? (
                        <div className="relative">
                          <img 
                            src={pwaConfig.icon_url} 
                            alt="PWA Icon" 
                            className="w-16 h-16 rounded-lg object-cover border shadow-sm"
                          />
                          <Button
                            size="sm"
                            variant="destructive"
                            className="absolute -top-2 -right-2 h-6 w-6 rounded-full p-0"
                            onClick={() => setPwaConfig({ ...pwaConfig, icon_url: '' })}
                          >
                            ×
                          </Button>
                        </div>
                      ) : (
                        <div className="w-16 h-16 bg-muted rounded-lg flex items-center justify-center border-2 border-dashed border-muted-foreground/25">
                          <ImageIcon className="h-8 w-8 text-muted-foreground" />
                        </div>
                      )}
                    </div>
                    
                    <div className="flex-1 space-y-2">
                      <div className="flex gap-2">
                        <Input
                          type="file"
                          accept="image/*"
                          onChange={async (e) => {
                            const file = e.target.files?.[0];
                            if (file) {
                              try {
                                // Create a preview URL for immediate display
                                const previewUrl = URL.createObjectURL(file);
                                setPwaConfig({ ...pwaConfig, icon_url: previewUrl });
                                
                                // Upload file to server
                                const uploadResult = await api.pwa.uploadIcon(file);
                                
                                // Update with permanent URL (use relative URL to work with any backend)
                                const permanentUrl = uploadResult.url.startsWith('http') ? uploadResult.url : `${window.location.protocol}//${window.location.hostname}:8000${uploadResult.url}`;
                                setPwaConfig({ ...pwaConfig, icon_url: permanentUrl });
                                
                                // Clean up preview URL
                                URL.revokeObjectURL(previewUrl);
                                
                                toast.success('Icon uploaded successfully!');
                              } catch (error) {
                                console.error('Upload failed:', error);
                                toast.error('Failed to upload icon');
                              }
                            }
                          }}
                          className="hidden"
                          id="icon-upload"
                        />
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          onClick={() => document.getElementById('icon-upload')?.click()}
                          className="flex-1"
                        >
                          <Upload className="h-4 w-4 mr-2" />
                          Upload Icon
                        </Button>
                      </div>
                      
                      <div className="space-y-1">
                        <Input
                          placeholder="Or paste icon URL"
                          value={pwaConfig.icon_url || ''}
                          onChange={(e) => setPwaConfig({ ...pwaConfig, icon_url: e.target.value })}
                          className="text-sm"
                        />
                      </div>
                      
                      <p className="text-xs text-muted-foreground">
                        Recommended: 512x512px PNG or JPG. Will be used for app icon and splash screen.
                      </p>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Features */}
            <Card className="card-hover">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Shield className="h-5 w-5" />
                  Features & Permissions
                </CardTitle>
                <CardDescription>
                  Configure what features are available in the PWA
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-3">
                  <label className="flex items-center justify-between">
                    <div className="flex flex-col">
                      <span className="text-sm font-medium">Push Notifications</span>
                      <span className="text-xs text-muted-foreground">Allow appointment reminders</span>
                    </div>
                    <input
                      type="checkbox"
                      checked={pwaConfig.features.notifications}
                      onChange={(e) => setPwaConfig({
                        ...pwaConfig,
                        features: { ...pwaConfig.features, notifications: e.target.checked }
                      })}
                      className="toggle"
                    />
                  </label>
                  
                  <label className="flex items-center justify-between">
                    <div className="flex flex-col">
                      <span className="text-sm font-medium">Offline Mode</span>
                      <span className="text-xs text-muted-foreground">Cache data for offline access</span>
                    </div>
                    <input
                      type="checkbox"
                      checked={pwaConfig.features.offline_mode}
                      onChange={(e) => setPwaConfig({
                        ...pwaConfig,
                        features: { ...pwaConfig.features, offline_mode: e.target.checked }
                      })}
                      className="toggle"
                    />
                  </label>
                  
                  <label className="flex items-center justify-between">
                    <div className="flex flex-col">
                      <span className="text-sm font-medium">Location Access</span>
                      <span className="text-xs text-muted-foreground">For location-based features</span>
                    </div>
                    <input
                      type="checkbox"
                      checked={pwaConfig.features.location_access}
                      onChange={(e) => setPwaConfig({
                        ...pwaConfig,
                        features: { ...pwaConfig.features, location_access: e.target.checked }
                      })}
                      className="toggle"
                    />
                  </label>
                </div>
              </CardContent>
            </Card>

            {/* PWA Preview & Deploy */}
            <Card className="card-hover">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Globe className="h-5 w-5" />
                  PWA Preview & Deployment
                </CardTitle>
                <CardDescription>
                  Preview and deploy your client PWA
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="p-4 bg-muted/50 rounded-lg border-2 border-dashed border-muted-foreground/25">
                  <div className="text-center space-y-3">
                    <Eye className="h-8 w-8 mx-auto text-muted-foreground" />
                    <div>
                      <h4 className="font-medium">PWA Preview</h4>
                      <p className="text-sm text-muted-foreground">
                        Generate your PWA to get a preview link
                      </p>
                    </div>
                    
                    {pwaGenerationResult && (
                      <div className="space-y-3">
                        <div className="space-y-2">
                          <label className="text-xs font-medium text-muted-foreground">Standard URL:</label>
                          <div className="flex items-center gap-2 p-2 bg-background rounded border">
                            <code className="flex-1 text-xs">{pwaGenerationResult.full_url}</code>
                            <Button
                              size="sm"
                              variant="ghost"
                              onClick={() => copyToClipboard(pwaGenerationResult.full_url)}
                            >
                              {copied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
                            </Button>
                            <Button 
                              size="sm" 
                              variant="ghost"
                              onClick={() => window.open(pwaGenerationResult.full_url, '_blank')}
                            >
                              <ExternalLink className="h-4 w-4" />
                            </Button>
                          </div>
                        </div>
                        
                        <div className="space-y-2">
                          <label className="text-xs font-medium text-muted-foreground">Subdomain Preview:</label>
                          <div className="flex items-center gap-2 p-2 bg-background rounded border">
                            <code className="flex-1 text-xs">{pwaGenerationResult.subdomain_preview}</code>
                            <Button
                              size="sm"
                              variant="ghost"
                              onClick={() => copyToClipboard(pwaGenerationResult.subdomain_url)}
                            >
                              {copied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
                            </Button>
                            <Button 
                              size="sm" 
                              variant="ghost"
                              onClick={() => window.open(pwaGenerationResult.subdomain_url, '_blank')}
                            >
                              <ExternalLink className="h-4 w-4" />
                            </Button>
                          </div>
                        </div>
                        
                        {pwaGenerationResult.subdomain_preview && (
                          <div className="p-3 bg-blue-50 dark:bg-blue-900/20 rounded-lg border border-blue-200 dark:border-blue-800">
                            <div className="flex items-center gap-2 mb-2">
                              <Globe className="h-4 w-4 text-blue-600" />
                              <span className="text-sm font-medium text-blue-800 dark:text-blue-200">Local Development Setup:</span>
                            </div>
                            <p className="text-xs text-blue-700 dark:text-blue-300 mb-2">
                              To test the subdomain locally, add this to your <code>/etc/hosts</code> file:
                            </p>
                            <code className="block text-xs bg-blue-100 dark:bg-blue-900/40 p-2 rounded border">
                              127.0.0.1 {pwaGenerationResult.subdomain_preview.replace(':8001', '')}
                            </code>
                            <p className="text-xs text-blue-700 dark:text-blue-300 mt-2">
                              Then visit: <a 
                                href={`http://${pwaGenerationResult.subdomain_preview}`} 
                                target="_blank" 
                                rel="noopener noreferrer"
                                className="underline hover:text-blue-800"
                              >
                                http://{pwaGenerationResult.subdomain_preview}
                              </a>
                            </p>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                </div>
                
                <Button
                  onClick={handleGenerate}
                  disabled={generatePWAMutation.isPending}
                  className="w-full"
                  variant="outline"
                >
                  {generatePWAMutation.isPending ? (
                    <>
                      <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                      Generating PWA...
                    </>
                  ) : (
                    <>
                      <Smartphone className="h-4 w-4 mr-2" />
                      Generate & Deploy PWA
                    </>
                  )}
                </Button>
              </CardContent>
            </Card>
          </div>
        )}

        {/* Design & Branding Tab */}
        {activeTab === 'design' && (
          <div className="grid gap-6 lg:grid-cols-2">
            {/* Typography */}
            <Card className="card-hover">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <i className="fas fa-font"></i>
                  Typography
                </CardTitle>
                <CardDescription>
                  Customize fonts and text styling
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <label className="text-sm font-medium mb-2 block">Font Family</label>
                  <select
                    value={pwaConfig.font_family || 'Inter'}
                    onChange={(e) => setPwaConfig({ ...pwaConfig, font_family: e.target.value })}
                    className="w-full px-3 py-2 border border-muted rounded-lg focus:border-primary/50 focus:outline-none focus:ring-2 focus:ring-primary/20 transition-all duration-300"
                  >
                    <option value="Inter">Inter (Default)</option>
                    <option value="Roboto">Roboto</option>
                    <option value="Open Sans">Open Sans</option>
                    <option value="Lato">Lato</option>
                    <option value="Montserrat">Montserrat</option>
                    <option value="Poppins">Poppins</option>
                  </select>
                </div>
                
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="text-sm font-medium mb-2 block">Base Font Size</label>
                    <input
                      type="range"
                      min="12"
                      max="24"
                      value={pwaConfig.font_size_base || 16}
                      onChange={(e) => setPwaConfig({ ...pwaConfig, font_size_base: parseInt(e.target.value) })}
                      className="w-full"
                    />
                    <span className="text-xs text-muted-foreground">{pwaConfig.font_size_base || 16}px</span>
                  </div>
                  
                  <div>
                    <label className="text-sm font-medium mb-2 block">Border Radius</label>
                    <input
                      type="range"
                      min="0"
                      max="24"
                      value={pwaConfig.border_radius || 12}
                      onChange={(e) => setPwaConfig({ ...pwaConfig, border_radius: parseInt(e.target.value) })}
                      className="w-full"
                    />
                    <span className="text-xs text-muted-foreground">{pwaConfig.border_radius || 12}px</span>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Layout Style */}
            <Card className="card-hover">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <i className="fas fa-layout"></i>
                  Layout & Style
                </CardTitle>
                <CardDescription>
                  Choose your PWA's visual style
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <label className="text-sm font-medium mb-2 block">Layout Style</label>
                  <div className="grid grid-cols-2 gap-3">
                    {['modern', 'classic', 'minimal', 'card'].map((style) => (
                      <label key={style} className="flex items-center gap-2 p-3 border rounded-lg cursor-pointer hover:border-primary/50 transition-colors">
                        <input
                          type="radio"
                          name="layout_style"
                          value={style}
                          checked={pwaConfig.layout_style === style}
                          onChange={(e) => setPwaConfig({ ...pwaConfig, layout_style: e.target.value })}
                          className="text-primary"
                        />
                        <span className="capitalize">{style}</span>
                      </label>
                    ))}
                  </div>
                </div>
                
                <div>
                  <label className="text-sm font-medium mb-2 block">Card Shadow</label>
                  <select
                    value={pwaConfig.card_shadow || 'medium'}
                    onChange={(e) => setPwaConfig({ ...pwaConfig, card_shadow: e.target.value })}
                    className="w-full px-3 py-2 border border-muted rounded-lg focus:border-primary/50 focus:outline-none focus:ring-2 focus:ring-primary/20 transition-all duration-300"
                  >
                    <option value="none">None</option>
                    <option value="light">Light</option>
                    <option value="medium">Medium</option>
                    <option value="heavy">Heavy</option>
                  </select>
                </div>
              </CardContent>
            </Card>
          </div>
        )}

        {/* Features Tab */}
        {activeTab === 'features' && (
          <div className="grid gap-6 lg:grid-cols-2">
            {/* Core Features */}
            <Card className="card-hover">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Shield className="h-5 w-5" />
                  Core Features
                </CardTitle>
                <CardDescription>
                  Enable or disable main PWA functionality
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-3">
                  {[
                    { key: 'appointments', label: 'Appointment Booking', desc: 'Allow clients to book appointments' },
                    { key: 'queue_management', label: 'Queue Management', desc: 'Enable queue system' },
                    { key: 'client_portal', label: 'Client Portal', desc: 'Personal client dashboard' },
                    { key: 'provider_directory', label: 'Provider Directory', desc: 'Show available providers' },
                    { key: 'appointment_history', label: 'Appointment History', desc: 'View past appointments' },
                    { key: 'profile_management', label: 'Profile Management', desc: 'Edit client profiles' }
                  ].map(({ key, label, desc }) => (
                    <label key={key} className="flex items-center justify-between">
                      <div className="flex flex-col">
                        <span className="text-sm font-medium">{label}</span>
                        <span className="text-xs text-muted-foreground">{desc}</span>
                      </div>
                      <input
                        type="checkbox"
                        checked={pwaConfig.features?.[key] ?? true}
                        onChange={(e) => setPwaConfig({
                          ...pwaConfig,
                          features: { ...pwaConfig.features, [key]: e.target.checked }
                        })}
                        className="toggle"
                      />
                    </label>
                  ))}
                </div>
              </CardContent>
            </Card>

            {/* PWA Features */}
            <Card className="card-hover">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Smartphone className="h-5 w-5" />
                  PWA Features
                </CardTitle>
                <CardDescription>
                  Progressive Web App capabilities
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-3">
                  {[
                    { key: 'push_notifications', label: 'Push Notifications', desc: 'Send appointment reminders' },
                    { key: 'offline_mode', label: 'Offline Mode', desc: 'Work without internet' },
                    { key: 'background_sync', label: 'Background Sync', desc: 'Sync when connection restored' },
                    { key: 'location_access', label: 'Location Access', desc: 'GPS for directions' },
                    { key: 'camera_access', label: 'Camera Access', desc: 'Photo uploads' }
                  ].map(({ key, label, desc }) => (
                    <label key={key} className="flex items-center justify-between">
                      <div className="flex flex-col">
                        <span className="text-sm font-medium">{label}</span>
                        <span className="text-xs text-muted-foreground">{desc}</span>
                      </div>
                      <input
                        type="checkbox"
                        checked={pwaConfig.features?.[key] ?? true}
                        onChange={(e) => setPwaConfig({
                          ...pwaConfig,
                          features: { ...pwaConfig.features, [key]: e.target.checked }
                        })}
                        className="toggle"
                      />
                    </label>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>
        )}

        {/* Advanced Tab */}
        {activeTab === 'advanced' && (
          <div className="grid gap-6">
            {/* Custom Code */}
            <Card className="card-hover">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <i className="fas fa-code"></i>
                  Custom Code
                </CardTitle>
                <CardDescription>
                  Add custom CSS, JavaScript, and HTML to your PWA
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <label className="text-sm font-medium mb-2 block">Custom CSS</label>
                  <textarea
                    value={pwaConfig.custom_css || ''}
                    onChange={(e) => setPwaConfig({ ...pwaConfig, custom_css: e.target.value })}
                    placeholder="/* Add your custom CSS here */"
                    className="w-full px-3 py-2 border border-muted rounded-lg focus:border-primary/50 focus:outline-none focus:ring-2 focus:ring-primary/20 transition-all duration-300 font-mono text-sm"
                    rows={6}
                  />
                </div>
                
                <div>
                  <label className="text-sm font-medium mb-2 block">Custom JavaScript</label>
                  <textarea
                    value={pwaConfig.custom_js || ''}
                    onChange={(e) => setPwaConfig({ ...pwaConfig, custom_js: e.target.value })}
                    placeholder="// Add your custom JavaScript here"
                    className="w-full px-3 py-2 border border-muted rounded-lg focus:border-primary/50 focus:outline-none focus:ring-2 focus:ring-primary/20 transition-all duration-300 font-mono text-sm"
                    rows={6}
                  />
                </div>
              </CardContent>
            </Card>

            {/* PWA Advanced Settings */}
            <Card className="card-hover">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <SettingsIcon className="h-5 w-5" />
                  PWA Advanced Settings
                </CardTitle>
                <CardDescription>
                  Fine-tune your PWA behavior and caching
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="text-sm font-medium mb-2 block">Cache Strategy</label>
                    <select
                      value={pwaConfig.cache_strategy || 'cache_first'}
                      onChange={(e) => setPwaConfig({ ...pwaConfig, cache_strategy: e.target.value })}
                      className="w-full px-3 py-2 border border-muted rounded-lg focus:border-primary/50 focus:outline-none focus:ring-2 focus:ring-primary/20 transition-all duration-300"
                    >
                      <option value="cache_first">Cache First</option>
                      <option value="network_first">Network First</option>
                      <option value="cache_only">Cache Only</option>
                      <option value="network_only">Network Only</option>
                    </select>
                  </div>
                  
                  <div>
                    <label className="text-sm font-medium mb-2 block">Default Language</label>
                    <select
                      value={pwaConfig.default_language || 'en'}
                      onChange={(e) => setPwaConfig({ ...pwaConfig, default_language: e.target.value })}
                      className="w-full px-3 py-2 border border-muted rounded-lg focus:border-primary/50 focus:outline-none focus:ring-2 focus:ring-primary/20 transition-all duration-300"
                    >
                      <option value="en">English</option>
                      <option value="es">Spanish</option>
                      <option value="fr">French</option>
                      <option value="de">German</option>
                      <option value="it">Italian</option>
                      <option value="pt">Portuguese</option>
                    </select>
                  </div>
                </div>
                
                <div>
                  <label className="text-sm font-medium mb-2 block">Offline Message</label>
                  <input
                    type="text"
                    value={pwaConfig.offline_message || 'You are currently offline'}
                    onChange={(e) => setPwaConfig({ ...pwaConfig, offline_message: e.target.value })}
                    className="w-full input-focus"
                  />
                </div>
              </CardContent>
            </Card>
          </div>
        )}

        {/* Analytics Tab */}
        {activeTab === 'analytics' && (
          <div className="grid gap-6 lg:grid-cols-2">
            {/* Analytics Services */}
            <Card className="card-hover">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <i className="fas fa-chart-line"></i>
                  Analytics & Tracking
                </CardTitle>
                <CardDescription>
                  Connect your analytics and tracking services
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <label className="text-sm font-medium mb-2 block">Google Analytics ID</label>
                  <input
                    type="text"
                    value={pwaConfig.google_analytics_id || ''}
                    onChange={(e) => setPwaConfig({ ...pwaConfig, google_analytics_id: e.target.value })}
                    placeholder="GA4-XXXXXXXXX"
                    className="w-full input-focus"
                  />
                </div>
                
                <div>
                  <label className="text-sm font-medium mb-2 block">Google Tag Manager ID</label>
                  <input
                    type="text"
                    value={pwaConfig.google_tag_manager_id || ''}
                    onChange={(e) => setPwaConfig({ ...pwaConfig, google_tag_manager_id: e.target.value })}
                    placeholder="GTM-XXXXXXX"
                    className="w-full input-focus"
                  />
                </div>
                
                <div>
                  <label className="text-sm font-medium mb-2 block">Facebook Pixel ID</label>
                  <input
                    type="text"
                    value={pwaConfig.facebook_pixel_id || ''}
                    onChange={(e) => setPwaConfig({ ...pwaConfig, facebook_pixel_id: e.target.value })}
                    placeholder="1234567890123456"
                    className="w-full input-focus"
                  />
                </div>
              </CardContent>
            </Card>

            {/* User Experience Analytics */}
            <Card className="card-hover">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <i className="fas fa-user-chart"></i>
                  User Experience
                </CardTitle>
                <CardDescription>
                  Tools for understanding user behavior
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <label className="text-sm font-medium mb-2 block">Hotjar Site ID</label>
                  <input
                    type="text"
                    value={pwaConfig.hotjar_site_id || ''}
                    onChange={(e) => setPwaConfig({ ...pwaConfig, hotjar_site_id: e.target.value })}
                    placeholder="1234567"
                    className="w-full input-focus"
                  />
                </div>
                
                <div>
                  <label className="text-sm font-medium mb-2 block">Intercom App ID</label>
                  <input
                    type="text"
                    value={pwaConfig.intercom_app_id || ''}
                    onChange={(e) => setPwaConfig({ ...pwaConfig, intercom_app_id: e.target.value })}
                    placeholder="abcd1234"
                    className="w-full input-focus"
                  />
                </div>
                
                <div className="p-4 bg-muted/50 rounded-lg">
                  <h4 className="font-medium mb-2">Privacy Notice</h4>
                  <p className="text-sm text-muted-foreground">
                    Make sure to update your privacy policy to include any analytics services you enable.
                    Consider implementing cookie consent banners if required by your jurisdiction.
                  </p>
                </div>
              </CardContent>
            </Card>
          </div>
        )}
      </motion.div>
    </div>
  )
}
