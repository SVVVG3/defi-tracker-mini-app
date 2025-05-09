# DeFi Position Tracker - Farcaster Mini App

A Farcaster Frame application that allows users to track their DeFi positions on Base chain and receive notifications when their concentrated liquidity positions go out of range.

## Features

- 🔒 Sign in with Farcaster authentication
- 👛 Automatic discovery of wallets connected to a user's Farcaster account
- 📊 View all DeFi positions across multiple wallets
- 🚨 Receive notifications in Farcaster when LP positions go out of range
- 📱 Mobile-friendly UI designed specifically for Farcaster Frames

## Tech Stack

- **Frontend**: Next.js, React, TypeScript
- **Authentication**: Farcaster SIWF (Sign in with Farcaster)
- **Data Sources**: Zapper Protocol API for DeFi position data
- **Styling**: Custom design system with CSS variables
- **Deployment**: Vercel

## Development Setup

### Prerequisites

- Node.js 18+ and npm
- Farcaster account for testing
- API keys for Neynar and Zapper

### Installation

1. Clone the repository:
   ```
   git clone https://github.com/yourusername/defi-tracker-mini-app.git
   cd defi-tracker-mini-app
   ```

2. Install dependencies:
   ```
   npm install
   ```

3. Create a `.env.local` file with the following variables:
   ```
   NEYNAR_API_KEY=your_neynar_api_key
   ZAPPER_API_KEY=your_zapper_api_key
   JWT_SECRET=your_jwt_secret_for_auth_tokens
   NEXT_PUBLIC_BASE_URL=http://localhost:3000
   MONITOR_API_KEY=your_monitor_api_key
   ```

4. Start the development server:
   ```
   npm run dev
   ```

5. For testing without authentication, use:
   ```
   http://localhost:3000/test
   ```

## Testing

### Developer Mode

The app includes a developer mode for testing without a Farcaster client:

1. Visit http://localhost:3000 in development
2. Click "Enable Developer Testing Mode"
3. Sign in with the mocked authentication

### Test Page

For direct API testing, visit http://localhost:3000/test to:
- Test authentication
- Fetch positions for test wallets
- Test custom wallet addresses
- Test the monitoring endpoint

## GitHub Setup

If you're setting up this project from scratch:

1. Initialize a Git repository:
   ```
   git init
   git add .
   git commit -m "Initial commit for DeFi Position Tracker mini-app"
   ```

2. Create a new repository on GitHub:
   - Go to GitHub.com and log in
   - Click "New repository" 
   - Name it "defi-tracker-mini-app"
   - Do NOT initialize with README, .gitignore, or license files

3. Connect your local repository:
   ```
   git remote add origin https://github.com/yourusername/defi-tracker-mini-app.git
   git branch -M main
   git push -u origin main
   ```

## Deployment

### Environment Setup

1. Create a `.env.production` file with production values similar to `.env.local` but with production URLs and API keys
2. Configure the following environment variables in the Vercel dashboard:
   - `NEYNAR_API_KEY`
   - `ZAPPER_API_KEY`
   - `JWT_SECRET`
   - `NEXT_PUBLIC_BASE_URL` (your production URL)
   - `MONITOR_API_KEY`

### Vercel Deployment

1. Connect your GitHub repository to Vercel:
   - Log in to Vercel and click "Add New Project"
   - Select your GitHub repository
   - Configure the build settings:
     - Framework Preset: Next.js
     - Build Command: `npm run build`
     - Output Directory: `.next`
     - Install Command: `npm install`

2. Add environment variables in the Vercel dashboard from your `.env.production` file

3. Deploy the application by clicking "Deploy"

### Setting Up Cron Jobs

To monitor positions automatically, set up cron jobs:

1. In Vercel dashboard, go to "Settings" > "Cron Jobs"
2. Add a new cron job:
   - Name: "Monitor Positions"
   - URL: `/api/cron-monitor`
   - Schedule: `0 */3 * * *` (runs every 3 hours)
   - HTTP Method: POST
   - Headers:
     - `Authorization`: `Bearer YOUR_MONITOR_API_KEY`

## API Documentation

### Authentication Endpoints

- `POST /api/auth/nonce` - Generate authentication nonce
- `POST /api/auth/verify` - Verify SIWF signature

### User Data Endpoints

- `GET /api/user/wallets` - Fetch user's connected wallets

### Position Data Endpoints

- `GET /api/positions` - Fetch DeFi positions for provided addresses

### Monitoring Endpoints

- `POST /api/monitor` - Check positions and send notifications if needed
- `POST /api/cron-monitor` - Secured endpoint for cron job monitoring

### Test Endpoints

- `POST /api/test/auth` - Test authentication without Farcaster client
- `GET /api/test/positions` - Test position fetching with authentication
- `GET /api/test/positions-standalone` - Test position fetching without authentication
- `POST /api/test/monitor` - Test position monitoring with authentication
- `GET /api/test/monitor-standalone` - Test position monitoring without authentication

## License

[MIT License](LICENSE)# defi-tracker-mini-app
