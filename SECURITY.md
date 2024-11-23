# Security Setup

1. Never commit .env or test.env files
2. Generate secure passwords and secrets using:
   ```bash
   node -e "console.log(require('crypto').randomBytes(64).toString('hex'))"
   ```
3. For testing:
   - Copy test.env.example to test.env
   - Run setup-auth.ts to create test users
   - Use test credentials only in development

4. Production deployment:
   - Use secrets management service
   - Enable all security headers
   - Regular security audits
   - Monitor for suspicious activities