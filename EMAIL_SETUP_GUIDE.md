# Email Service Configuration Guide

This guide helps you configure email services for WaitLessQ to send client invitations and notifications.

## 📧 Email Service Features

- **Client Invitations**: Automatically send professional invitation emails when clients are created
- **HTML Templates**: Beautiful, responsive email templates with branding
- **Multiple SMTP Providers**: Support for Gmail, Outlook, SendGrid, and other SMTP services
- **Security**: Secure authentication and TLS encryption
- **Error Handling**: Comprehensive error handling and logging

## 🚀 Quick Setup

### 1. Gmail Configuration (Recommended for Development)

1. **Enable 2-Factor Authentication** on your Gmail account
2. **Generate App Password**:
   - Go to Google Account Settings → Security
   - Under "2-Step Verification", click "App passwords"
   - Generate a new app password for "Mail"
3. **Update Environment Variables**:

```bash
# Gmail SMTP Configuration
SMTP_SERVER=smtp.gmail.com
SMTP_PORT=587
SMTP_USERNAME=your-gmail@gmail.com
SMTP_PASSWORD=your-16-character-app-password
FROM_EMAIL=your-gmail@gmail.com
FROM_NAME=Your Business Name
```

### 2. Outlook/Hotmail Configuration

```bash
# Outlook SMTP Configuration
SMTP_SERVER=smtp-mail.outlook.com
SMTP_PORT=587
SMTP_USERNAME=your-email@outlook.com
SMTP_PASSWORD=your-password
FROM_EMAIL=your-email@outlook.com
FROM_NAME=Your Business Name
```

### 3. SendGrid Configuration (Recommended for Production)

1. **Create SendGrid Account** at https://sendgrid.com
2. **Generate API Key** in SendGrid dashboard
3. **Configure Environment**:

```bash
# SendGrid SMTP Configuration
SMTP_SERVER=smtp.sendgrid.net
SMTP_PORT=587
SMTP_USERNAME=apikey
SMTP_PASSWORD=your-sendgrid-api-key
FROM_EMAIL=noreply@yourdomain.com
FROM_NAME=Your Business Name
```

### 4. Custom SMTP Server

```bash
# Custom SMTP Configuration
SMTP_SERVER=mail.yourdomain.com
SMTP_PORT=587
SMTP_USERNAME=noreply@yourdomain.com
SMTP_PASSWORD=your-password
FROM_EMAIL=noreply@yourdomain.com
FROM_NAME=Your Business Name
```

## 🧪 Testing Email Configuration

### 1. Run Email Test Script

```bash
cd backend
python test_email.py
```

### 2. Test with Your Email

```bash
cd backend
python test_email.py your-test-email@example.com
```

### 3. Expected Output

```
📧 Current Email Configuration:
   SMTP Server: smtp.gmail.com
   SMTP Port: 587
   SMTP Username: your-email@gmail.com
   From Email: your-email@gmail.com
   From Name: Your Business Name

🧪 WaitLessQ Email Service Test Suite
==================================================

1️⃣  Validating Email Configuration...
   ✅ PASS: Configuration validated

2️⃣  Testing SMTP Connection...
   ✅ PASS: SMTP connection and authentication successful

3️⃣  Testing Email Send to your-test-email@example.com...
   ✅ PASS: Test email sent successfully

4️⃣  Testing Invitation Email to your-test-email@example.com...
   ✅ PASS: Invitation email sent successfully

📊 Test Summary
==============================
Total Tests: 4
Passed: 4
Failed: 0
✅ All tests passed! Email service is working correctly.
```

## 🔧 Production Configuration

### Environment Variables

Create a `.env` file in the backend directory:

```bash
# Production Email Configuration
SMTP_SERVER=smtp.sendgrid.net
SMTP_PORT=587
SMTP_USERNAME=apikey
SMTP_PASSWORD=SG.your-sendgrid-api-key
FROM_EMAIL=noreply@yourbusiness.com
FROM_NAME=Your Business Name

# Client System Configuration
CLIENT_JWT_SECRET_KEY=your-secure-jwt-secret
CLIENT_ACCESS_TOKEN_EXPIRE_MINUTES=10080
CLIENT_INVITATION_EXPIRE_DAYS=7
PWA_BASE_URL=https://yourdomain.com
```

### Security Best Practices

1. **Use App Passwords**: Never use your main email password
2. **Environment Variables**: Store credentials in environment variables, not in code
3. **Dedicated Email**: Use a dedicated email address for system emails
4. **Rate Limiting**: Configure appropriate rate limits for email sending
5. **Monitoring**: Monitor email delivery rates and failures

## 📱 Email Templates

### Client Invitation Email Features

- **Professional Design**: Modern, responsive HTML template
- **Branding Support**: Custom logos and colors
- **Feature Highlights**: Clear benefits of creating an account
- **Security**: Secure invitation links with expiration
- **Accessibility**: Plain text fallback for all clients

### Customization

Email templates can be customized in:
- `backend/app/services/email_service.py` - Email content and styling
- PWA Settings in dashboard - Branding and colors

## 🚨 Troubleshooting

### Common Issues

#### 1. "Authentication Failed"
- **Gmail**: Ensure 2FA is enabled and you're using an App Password
- **Outlook**: Check if "Less secure app access" is enabled
- **Custom**: Verify username/password combination

#### 2. "Connection Refused"
- Check SMTP server address and port
- Verify firewall settings
- Try different ports (25, 465, 587, 2525)

#### 3. "Email Not Delivered"
- Check spam/junk folders
- Verify FROM_EMAIL domain reputation
- Review email content for spam triggers

#### 4. "SSL/TLS Errors"
- Ensure correct port for TLS (587) or SSL (465)
- Update Python SSL certificates
- Try different security protocols

### Debug Mode

Enable debug logging in `backend/app/services/email_service.py`:

```python
import logging
logging.basicConfig(level=logging.DEBUG)
```

## 📊 Monitoring

### Email Delivery Tracking

Monitor email delivery through:

1. **Application Logs**: Check backend logs for email sending status
2. **SMTP Provider**: Use provider dashboards (SendGrid, etc.)
3. **Database**: Track invitation status in client records

### Metrics to Monitor

- **Delivery Rate**: Percentage of emails successfully sent
- **Open Rate**: Percentage of emails opened (if tracking enabled)
- **Click Rate**: Percentage of invitation links clicked
- **Error Rate**: Failed email attempts

## 🔄 Integration with Client System

### Automatic Invitations

When a client is created in the dashboard:
1. Client record is created in database
2. Invitation token is generated
3. Email is sent automatically
4. Client receives professional invitation
5. Client can create account via secure link

### Manual Invitations

Admins can also:
- Resend invitations from the Clients page
- Send invitations to existing clients
- Track invitation status and expiration

## 📈 Advanced Configuration

### Multiple Email Templates

Create different templates for:
- Client invitations
- Appointment reminders
- Password resets
- Marketing communications

### Email Queues

For high-volume usage, consider:
- Background job queues (Celery, RQ)
- Email service providers with APIs
- Rate limiting and retry logic

### Analytics Integration

Track email performance with:
- Google Analytics UTM parameters
- Email service provider analytics
- Custom tracking pixels

## 🆘 Support

If you encounter issues:

1. **Run the test script** to diagnose configuration problems
2. **Check logs** in `logs/backend.log` for detailed error messages
3. **Verify credentials** with your email provider
4. **Test with different email addresses** to rule out recipient issues
5. **Review firewall settings** if connection issues persist

## 📚 Additional Resources

- [Gmail App Passwords Guide](https://support.google.com/accounts/answer/185833)
- [SendGrid SMTP Documentation](https://docs.sendgrid.com/for-developers/sending-email/integrating-with-the-smtp-api)
- [Python SMTPLIB Documentation](https://docs.python.org/3/library/smtplib.html)
- [Email Security Best Practices](https://www.cloudflare.com/learning/email-security/)

---

**Need help?** The email test script provides detailed diagnostics to help identify and resolve configuration issues quickly.
