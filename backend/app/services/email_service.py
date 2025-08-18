"""
Email Service for sending client invitations and notifications.
"""

import smtplib
import ssl
from email.mime.text import MIMEText
from email.mime.multipart import MIMEMultipart
from typing import Optional
from datetime import datetime, timedelta
import secrets
import string

from app.core.config import settings


class EmailService:
    """Service for sending emails"""
    
    def __init__(self):
        # Email configuration - these should be in environment variables
        self.smtp_server = getattr(settings, 'SMTP_SERVER', 'smtp.gmail.com')
        self.smtp_port = getattr(settings, 'SMTP_PORT', 587)
        self.smtp_username = getattr(settings, 'SMTP_USERNAME', '')
        self.smtp_password = getattr(settings, 'SMTP_PASSWORD', '')
        self.from_email = getattr(settings, 'FROM_EMAIL', self.smtp_username)
        self.from_name = getattr(settings, 'FROM_NAME', 'WaitLessQ')
    
    def send_email(self, to_email: str, subject: str, html_content: str, text_content: str = None) -> bool:
        """
        Send an email
        
        Args:
            to_email: Recipient email address
            subject: Email subject
            html_content: HTML content of the email
            text_content: Plain text content (optional)
            
        Returns:
            True if email was sent successfully, False otherwise
        """
        # Check if email configuration is complete
        if not self.smtp_username or not self.smtp_password or not self.from_email:
            print(f"❌ Email configuration incomplete - cannot send email to {to_email}")
            print(f"   SMTP_USERNAME: {'✓' if self.smtp_username else '✗'}")
            print(f"   SMTP_PASSWORD: {'✓' if self.smtp_password else '✗'}")
            print(f"   FROM_EMAIL: {'✓' if self.from_email else '✗'}")
            return False
        
        try:
            # Create message
            message = MIMEMultipart("alternative")
            message["Subject"] = subject
            message["From"] = f"{self.from_name} <{self.from_email}>"
            message["To"] = to_email
            
            # Add text part
            if text_content:
                text_part = MIMEText(text_content, "plain")
                message.attach(text_part)
            
            # Add HTML part
            html_part = MIMEText(html_content, "html")
            message.attach(html_part)
            
            # Create secure connection and send email
            context = ssl.create_default_context()
            with smtplib.SMTP(self.smtp_server, self.smtp_port) as server:
                server.starttls(context=context)
                server.login(self.smtp_username, self.smtp_password)
                server.sendmail(self.from_email, to_email, message.as_string())
            
            print(f"✅ Email sent successfully to {to_email}")
            return True
            
        except Exception as e:
            print(f"❌ Failed to send email to {to_email}: {str(e)}")
            return False
    
    def send_client_invitation(
        self, 
        client_name: str, 
        client_email: str, 
        provider_name: str,
        invitation_link: str,
        provider_logo_url: Optional[str] = None
    ) -> bool:
        """
        Send invitation email to a new client
        
        Args:
            client_name: Name of the client
            client_email: Email of the client
            provider_name: Name of the provider/business
            invitation_link: Link to create account and access PWA
            provider_logo_url: Optional logo URL
            
        Returns:
            True if email was sent successfully
        """
        subject = f"Welcome to {provider_name} - Create Your Account"
        
        # HTML email template
        html_content = f"""
        <!DOCTYPE html>
        <html>
        <head>
            <meta charset="utf-8">
            <meta name="viewport" content="width=device-width, initial-scale=1.0">
            <title>Welcome to {provider_name}</title>
            <style>
                body {{
                    font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
                    line-height: 1.6;
                    color: #333;
                    max-width: 600px;
                    margin: 0 auto;
                    padding: 20px;
                    background-color: #f8f9fa;
                }}
                .container {{
                    background: white;
                    border-radius: 12px;
                    padding: 40px;
                    box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
                }}
                .header {{
                    text-align: center;
                    margin-bottom: 30px;
                }}
                .logo {{
                    max-width: 150px;
                    height: auto;
                    margin-bottom: 20px;
                }}
                .title {{
                    color: #6366f1;
                    font-size: 28px;
                    font-weight: bold;
                    margin: 0;
                }}
                .subtitle {{
                    color: #6b7280;
                    font-size: 16px;
                    margin: 10px 0 0 0;
                }}
                .content {{
                    margin: 30px 0;
                }}
                .greeting {{
                    font-size: 18px;
                    font-weight: 600;
                    color: #1f2937;
                    margin-bottom: 20px;
                }}
                .message {{
                    font-size: 16px;
                    color: #4b5563;
                    margin-bottom: 25px;
                }}
                .cta-button {{
                    display: inline-block;
                    background: linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%);
                    color: white;
                    text-decoration: none;
                    padding: 16px 32px;
                    border-radius: 8px;
                    font-weight: 600;
                    font-size: 16px;
                    text-align: center;
                    box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
                    transition: all 0.3s ease;
                }}
                .cta-button:hover {{
                    transform: translateY(-2px);
                    box-shadow: 0 6px 12px rgba(0, 0, 0, 0.15);
                }}
                .features {{
                    background: #f9fafb;
                    border-radius: 8px;
                    padding: 20px;
                    margin: 25px 0;
                }}
                .feature {{
                    display: flex;
                    align-items: center;
                    margin: 12px 0;
                }}
                .feature-icon {{
                    color: #10b981;
                    margin-right: 12px;
                    font-size: 18px;
                }}
                .footer {{
                    margin-top: 30px;
                    padding-top: 20px;
                    border-top: 1px solid #e5e7eb;
                    text-align: center;
                    color: #6b7280;
                    font-size: 14px;
                }}
            </style>
        </head>
        <body>
            <div class="container">
                <div class="header">
                    {f'<img src="{provider_logo_url}" alt="{provider_name}" class="logo">' if provider_logo_url else ''}
                    <h1 class="title">Welcome to {provider_name}!</h1>
                    <p class="subtitle">You've been invited to create your client account</p>
                </div>
                
                <div class="content">
                    <p class="greeting">Hello {client_name},</p>
                    
                    <p class="message">
                        Great news! {provider_name} has created an account for you in their system. 
                        You can now create your personal account to manage your appointments, view your history, 
                        and access exclusive features.
                    </p>
                    
                    <div style="text-align: center; margin: 30px 0;">
                        <a href="{invitation_link}" class="cta-button">
                            Create Your Account
                        </a>
                    </div>
                    
                    <div class="features">
                        <h3 style="color: #1f2937; margin-top: 0;">With your account, you can:</h3>
                        <div class="feature">
                            <span class="feature-icon">✅</span>
                            <span>View and manage your appointments</span>
                        </div>
                        <div class="feature">
                            <span class="feature-icon">📅</span>
                            <span>Book new appointments online</span>
                        </div>
                        <div class="feature">
                            <span class="feature-icon">📱</span>
                            <span>Access your personalized mobile app</span>
                        </div>
                        <div class="feature">
                            <span class="feature-icon">🔔</span>
                            <span>Receive appointment reminders</span>
                        </div>
                        <div class="feature">
                            <span class="feature-icon">📋</span>
                            <span>View your appointment history</span>
                        </div>
                    </div>
                    
                    <p class="message">
                        This invitation link will expire in 7 days. If you have any questions, 
                        please contact {provider_name} directly.
                    </p>
                </div>
                
                <div class="footer">
                    <p>This invitation was sent by {provider_name} through WaitLessQ.</p>
                    <p>If you didn't expect this invitation, you can safely ignore this email.</p>
                </div>
            </div>
        </body>
        </html>
        """
        
        # Plain text version
        text_content = f"""
        Welcome to {provider_name}!
        
        Hello {client_name},
        
        {provider_name} has invited you to create your client account. 
        
        With your account, you can:
        - View and manage your appointments
        - Book new appointments online  
        - Access your personalized mobile app
        - Receive appointment reminders
        - View your appointment history
        
        Create your account here: {invitation_link}
        
        This invitation expires in 7 days.
        
        If you have questions, contact {provider_name} directly.
        
        ---
        This invitation was sent by {provider_name} through WaitLessQ.
        """
        
        return self.send_email(client_email, subject, html_content, text_content)
    
    def generate_invitation_token(self, length: int = 32) -> str:
        """Generate a secure random token for invitations"""
        alphabet = string.ascii_letters + string.digits
        return ''.join(secrets.choice(alphabet) for _ in range(length))


# Global email service instance
email_service = EmailService()
