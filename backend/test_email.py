#!/usr/bin/env python3
"""
Email Service Test Script
Tests email functionality with various SMTP configurations
"""

import os
import sys
import asyncio
from datetime import datetime
from typing import Dict, List, Optional

# Add the app directory to Python path
sys.path.append(os.path.join(os.path.dirname(__file__), 'app'))

from app.services.email_service import EmailService
from app.core.config import settings

class EmailTester:
    """Test email service with different configurations"""
    
    def __init__(self):
        self.email_service = EmailService()
        self.test_results: List[Dict] = []
    
    def test_smtp_connection(self) -> Dict:
        """Test SMTP connection without sending email"""
        result = {
            'test': 'SMTP Connection',
            'timestamp': datetime.now().isoformat(),
            'success': False,
            'message': '',
            'config': {
                'server': self.email_service.smtp_server,
                'port': self.email_service.smtp_port,
                'username': self.email_service.smtp_username,
                'from_email': self.email_service.from_email,
                'from_name': self.email_service.from_name
            }
        }
        
        try:
            import smtplib
            import ssl
            
            # Test connection
            context = ssl.create_default_context()
            with smtplib.SMTP(self.email_service.smtp_server, self.email_service.smtp_port) as server:
                server.starttls(context=context)
                if self.email_service.smtp_username and self.email_service.smtp_password:
                    server.login(self.email_service.smtp_username, self.email_service.smtp_password)
                    result['message'] = 'SMTP connection and authentication successful'
                else:
                    result['message'] = 'SMTP connection successful (no authentication)'
                result['success'] = True
                
        except Exception as e:
            result['message'] = f'SMTP connection failed: {str(e)}'
            result['success'] = False
            
        self.test_results.append(result)
        return result
    
    def test_email_send(self, test_email: str) -> Dict:
        """Test sending an actual email"""
        result = {
            'test': 'Email Send',
            'timestamp': datetime.now().isoformat(),
            'success': False,
            'message': '',
            'recipient': test_email
        }
        
        try:
            subject = f"WaitLessQ Email Test - {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}"
            
            html_content = """
            <!DOCTYPE html>
            <html>
            <head>
                <meta charset="utf-8">
                <title>Email Test</title>
                <style>
                    body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
                    .container { max-width: 600px; margin: 0 auto; padding: 20px; }
                    .header { text-align: center; background: #6366f1; color: white; padding: 20px; border-radius: 8px; }
                    .content { padding: 20px; background: #f9fafb; border-radius: 8px; margin: 20px 0; }
                    .success { color: #10b981; font-weight: bold; }
                </style>
            </head>
            <body>
                <div class="container">
                    <div class="header">
                        <h1>WaitLessQ Email Test</h1>
                        <p>Email Service Configuration Test</p>
                    </div>
                    <div class="content">
                        <p class="success">✅ Email service is working correctly!</p>
                        <p>This is a test email sent from the WaitLessQ backend system.</p>
                        <p><strong>Test Details:</strong></p>
                        <ul>
                            <li>Sent at: {datetime.now().strftime('%Y-%m-%d %H:%M:%S UTC')}</li>
                            <li>SMTP Server: {self.email_service.smtp_server}</li>
                            <li>From: {self.email_service.from_name} &lt;{self.email_service.from_email}&gt;</li>
                        </ul>
                        <p>If you received this email, your email configuration is working properly.</p>
                    </div>
                </div>
            </body>
            </html>
            """
            
            text_content = f"""
            WaitLessQ Email Test
            
            ✅ Email service is working correctly!
            
            This is a test email sent from the WaitLessQ backend system.
            
            Test Details:
            - Sent at: {datetime.now().strftime('%Y-%m-%d %H:%M:%S UTC')}
            - SMTP Server: {self.email_service.smtp_server}
            - From: {self.email_service.from_name} <{self.email_service.from_email}>
            
            If you received this email, your email configuration is working properly.
            """
            
            success = self.email_service.send_email(test_email, subject, html_content, text_content)
            
            if success:
                result['success'] = True
                result['message'] = 'Test email sent successfully'
            else:
                result['success'] = False
                result['message'] = 'Failed to send test email'
                
        except Exception as e:
            result['success'] = False
            result['message'] = f'Error sending test email: {str(e)}'
            
        self.test_results.append(result)
        return result
    
    def test_invitation_email(self, test_email: str) -> Dict:
        """Test sending a client invitation email"""
        result = {
            'test': 'Client Invitation Email',
            'timestamp': datetime.now().isoformat(),
            'success': False,
            'message': '',
            'recipient': test_email
        }
        
        try:
            success = self.email_service.send_client_invitation(
                client_name="Test Client",
                client_email=test_email,
                provider_name="Test Provider",
                invitation_link=f"http://org-1.localhost:8001/?token=test123",
                provider_logo_url=None
            )
            
            if success:
                result['success'] = True
                result['message'] = 'Invitation email sent successfully'
            else:
                result['success'] = False
                result['message'] = 'Failed to send invitation email'
                
        except Exception as e:
            result['success'] = False
            result['message'] = f'Error sending invitation email: {str(e)}'
            
        self.test_results.append(result)
        return result
    
    def validate_configuration(self) -> Dict:
        """Validate email configuration"""
        result = {
            'test': 'Configuration Validation',
            'timestamp': datetime.now().isoformat(),
            'success': True,
            'message': 'Configuration validated',
            'issues': []
        }
        
        # Check required configuration
        if not self.email_service.smtp_server:
            result['issues'].append('SMTP_SERVER not configured')
        
        if not self.email_service.smtp_port:
            result['issues'].append('SMTP_PORT not configured')
        
        if not self.email_service.smtp_username:
            result['issues'].append('SMTP_USERNAME not configured')
        
        if not self.email_service.smtp_password:
            result['issues'].append('SMTP_PASSWORD not configured')
        
        if not self.email_service.from_email:
            result['issues'].append('FROM_EMAIL not configured')
        
        # Validate email format
        if self.email_service.from_email and '@' not in self.email_service.from_email:
            result['issues'].append('FROM_EMAIL format is invalid')
        
        # Check port range
        if not (1 <= self.email_service.smtp_port <= 65535):
            result['issues'].append(f'SMTP_PORT {self.email_service.smtp_port} is not in valid range')
        
        if result['issues']:
            result['success'] = False
            result['message'] = f"Configuration issues found: {', '.join(result['issues'])}"
        
        self.test_results.append(result)
        return result
    
    def run_all_tests(self, test_email: Optional[str] = None):
        """Run all email tests"""
        print("🧪 WaitLessQ Email Service Test Suite")
        print("=" * 50)
        
        # 1. Validate configuration
        print("\n1️⃣  Validating Email Configuration...")
        config_result = self.validate_configuration()
        self.print_result(config_result)
        
        if not config_result['success']:
            print("\n❌ Configuration validation failed. Please fix configuration issues before testing.")
            return False
        
        # 2. Test SMTP connection
        print("\n2️⃣  Testing SMTP Connection...")
        connection_result = self.test_smtp_connection()
        self.print_result(connection_result)
        
        if not connection_result['success']:
            print("\n❌ SMTP connection failed. Cannot proceed with email tests.")
            return False
        
        # 3. Test email sending (if test email provided)
        if test_email:
            print(f"\n3️⃣  Testing Email Send to {test_email}...")
            send_result = self.test_email_send(test_email)
            self.print_result(send_result)
            
            print(f"\n4️⃣  Testing Invitation Email to {test_email}...")
            invitation_result = self.test_invitation_email(test_email)
            self.print_result(invitation_result)
        else:
            print("\n⚠️  No test email provided. Skipping email send tests.")
            print("   To test email sending, run: python test_email.py your-email@example.com")
        
        # Summary
        print("\n📊 Test Summary")
        print("=" * 30)
        total_tests = len(self.test_results)
        passed_tests = sum(1 for result in self.test_results if result['success'])
        
        print(f"Total Tests: {total_tests}")
        print(f"Passed: {passed_tests}")
        print(f"Failed: {total_tests - passed_tests}")
        
        if passed_tests == total_tests:
            print("✅ All tests passed! Email service is working correctly.")
            return True
        else:
            print("❌ Some tests failed. Check configuration and network connectivity.")
            return False
    
    def print_result(self, result: Dict):
        """Print test result"""
        status = "✅ PASS" if result['success'] else "❌ FAIL"
        print(f"   {status}: {result['message']}")
        
        if not result['success'] and 'issues' in result:
            for issue in result['issues']:
                print(f"      - {issue}")

def main():
    """Main test function"""
    tester = EmailTester()
    
    # Get test email from command line argument
    test_email = None
    if len(sys.argv) > 1:
        test_email = sys.argv[1]
        if '@' not in test_email:
            print("❌ Invalid email address provided")
            sys.exit(1)
    
    # Show current configuration
    print("📧 Current Email Configuration:")
    print(f"   SMTP Server: {tester.email_service.smtp_server}")
    print(f"   SMTP Port: {tester.email_service.smtp_port}")
    print(f"   SMTP Username: {tester.email_service.smtp_username}")
    print(f"   From Email: {tester.email_service.from_email}")
    print(f"   From Name: {tester.email_service.from_name}")
    
    # Run tests
    success = tester.run_all_tests(test_email)
    
    # Exit with appropriate code
    sys.exit(0 if success else 1)

if __name__ == "__main__":
    main()
