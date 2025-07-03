# Estimation Tool SSE Client

A modern Next.js application for real-time project estimation with Server-Sent Events (SSE) integration. This tool provides an interactive interface for uploading RFP documents and receiving real-time analysis results.

## Features

🚀 **Real-time Communication**: Server-Sent Events for live updates  
📁 **File Upload**: PDF document processing with validation  
🎨 **Modern UI**: Glass morphism design with Tailwind CSS  
🔄 **Connection Management**: Smart SSE connection handling  
⚡ **Error Handling**: Comprehensive error recovery with modern toasts  
📊 **Progress Tracking**: Step-by-step analysis visualization  
🛡️ **Security**: Built-in security headers and validation  

## Tech Stack

- **Frontend**: Next.js 15, React 19, TypeScript
- **Styling**: Tailwind CSS 4
- **Real-time**: Server-Sent Events (SSE)
- **UI Components**: React Hot Toast
- **PDF Processing**: Integration with backend API
- **Deployment**: AWS Amplify

## Getting Started

### Prerequisites

- Node.js 18+ 
- npm or yarn
- Your API and SSE endpoints

### Installation

1. Clone the repository:
```bash
git clone https://github.com/Q-Agency/estimation-tool-public.git
cd estimation-tool-public
```

2. Install dependencies:
```bash
npm install
```

3. Set up environment variables:
```bash
cp .env.example .env.local
# Edit .env.local with your API endpoints
```

4. Run the development server:
```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) to see the application.

## Environment Variables

| Variable | Description | Required |
|----------|-------------|----------|
| `NEXT_PUBLIC_API_BASE_URL` | Your API endpoint | Yes |
| `NEXT_PUBLIC_SSE_BASE_URL` | Your SSE endpoint | Yes |
| `NODE_ENV` | Environment mode | Auto-set |

## Scripts

```bash
npm run dev          # Development server
npm run build        # Production build
npm run start        # Production server
npm run lint         # Run ESLint
npm run build:test   # Build for testing
npm run build:production # Build for production
```

## Deployment

### AWS Amplify (Recommended)

This project is optimized for AWS Amplify deployment:

1. **Quick Deploy**: See [README-AWS-AMPLIFY.md](./README-AWS-AMPLIFY.md) for detailed instructions
2. **One-click Deploy**: Connect your GitHub repository to AWS Amplify
3. **Automatic**: Builds and deploys on every push to main

### Other Platforms

- **Vercel**: Works out of the box
- **Netlify**: Compatible with minor configuration
- **Docker**: Dockerfile can be added if needed

## Project Structure

```
src/
├── app/                 # Next.js app directory
│   ├── api/            # API routes
│   ├── globals.css     # Global styles
│   ├── layout.tsx      # Root layout
│   └── page.tsx        # Main page
├── components/         # React components
│   ├── ConnectionIndicator.tsx
│   └── DevelopmentPlanDisplay.tsx
├── hooks/              # Custom React hooks
│   ├── useSSE.ts       # SSE management
│   └── useEstimationSteps.ts
├── services/           # API services
├── types/              # TypeScript types
├── utils/              # Utility functions
└── constants/          # Application constants
```

## Features Deep Dive

### Real-time Updates
- SSE connection with automatic reconnection
- Connection status indicator
- Heartbeat monitoring

### Error Handling
- Modern toast notifications
- Graceful error recovery
- State reset on errors

### File Processing
- PDF validation and size limits
- Progress tracking
- Drag & drop support

### Modern UI
- Glass morphism design
- Smooth animations
- Responsive layout
- Dark mode support

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests if applicable
5. Submit a pull request

## Support

For issues and questions:
- Check the [AWS Amplify deployment guide](./README-AWS-AMPLIFY.md)
- Review the troubleshooting section
- Open an issue on GitHub

## License

This project is proprietary software owned by Q-Agency.
