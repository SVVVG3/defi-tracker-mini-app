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

## Deployment

### Environment Setup

1. Create a `.env.production` file with production values
2. Configure the environment variables in the Vercel dashboard

### Vercel Deployment

1. Connect your GitHub repository to Vercel
2. Configure the build settings:
   - Framework Preset: Next.js
   - Build Command: `npm run build`

3. Add environment variables in the Vercel dashboard
4. Deploy the application

### Background Jobs

The position monitoring job needs to be set up separately:

1. Use Vercel Cron Jobs or a service like Upstash
2. Schedule regular calls to the monitoring endpoint
3. Ensure the service has the necessary API keys

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

## License

[MIT License](LICENSE) 