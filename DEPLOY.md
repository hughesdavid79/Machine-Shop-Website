Local Development
1. Install Dependencies

Install the required packages for both the frontend and backend:

npm install
cd server && npm install
cd ..

2. Set Up Environment Variables

Create a .env.development file in the project root with your local development settings. Ensure the file includes configurations like database connections, API keys, and other environment-specific settings. Example:

API_URL=http://localhost:5000/api
DB_URI=mongodb://localhost:27017/machine-shop

3. Start Development Server

Run the development server to test your changes locally:

npm run dev

Access the application via http://localhost:3000 for the frontend and http://localhost:5000 for the backend (if applicable).
Production Deployment
Backend Deployment (Render)

    Push Changes to GitHub Ensure your changes are committed and pushed to the repository linked with your Render service.

    git add .
    git commit -m "Deployment updates"
    git push origin main

    Render Auto-Deploy Render will automatically detect changes and deploy the backend. You can monitor deployment progress via the Render dashboard.

    Verify Backend Health Confirm the backend is operational by visiting the health check endpoint:

    https://machine-shop-website.onrender.com/api/health

    The endpoint should return a 200 OK response or a JSON object indicating successful deployment.

Frontend Deployment (GitHub Pages)

    Build and Deploy Frontend Deploy the frontend to GitHub Pages using the following command:

    npm run deploy

    Verify Frontend Deployment Once deployed, verify the application at:

    https://rpomachineshop.com

    Ensure the application loads correctly and integrates seamlessly with the backend.

Additional Configuration
Environment Variables

Ensure environment variables are correctly configured in both local and production environments:

    For local development: Use .env.development
    For Render: Set variables in the Render Dashboard under the Environment tab.

Example variables to configure:

    DB_URI
    API_URL
    CORS_ALLOWED_ORIGINS

CORS Settings

If API calls fail, verify that CORS is configured correctly in the backend:

    Add the frontend URL to the allowed origins.
    Example configuration in server.js:

const cors = require('cors');

app.use(cors({
  origin: ['http://localhost:3000', 'https://rpomachineshop.com'],
}));

Troubleshooting
Backend Issues

    Render Logs: Check the logs in the Render dashboard for errors related to the backend.
    Health Check: Verify the backend health endpoint to ensure it is operational.

Frontend Issues

    Build Failures: Review terminal logs during npm run deploy for issues.
    API Errors: Confirm that the API URL in the frontend .env file matches the Render backend URL.

Common Issues

    Environment Variable Mismatch: Ensure all necessary environment variables are set in both local and production environments.
    CORS Errors: Verify that allowed origins include both development and production URLs.

Maintenance

    Monitor Logs:
        Backend: Use Render's logging system to monitor application performance and error reports.
        Frontend: Use browser developer tools to debug frontend issues.

    Update Dependencies: Periodically run the following to ensure your packages are up-to-date:

npm update

Backup Configuration:

    Backup .env files and database configuration for both development and production environments.

Regular Testing:

    Test the application in staging environments before deploying to production.