#!/bin/bash

# Setup Environment Variables for Estimation Tool SSE Client
# This script helps you set up the required environment variables

echo "🚀 Setting up environment variables for Estimation Tool SSE Client"
echo "=================================================="

# Check if .env.local already exists
if [ -f ".env.local" ]; then
    echo "⚠️  .env.local already exists. Do you want to overwrite it? (y/N)"
    read -r response
    if [[ ! "$response" =~ ^[Yy]$ ]]; then
        echo "❌ Aborted. Keeping existing .env.local file."
        exit 0
    fi
fi

# Create .env.local file
echo "📝 Creating .env.local file..."

# Get API Base URL
echo ""
echo "🔗 Please enter your API base URL:"
echo "   Example: https://api.example.com/api"
read -r api_url

# Get SSE Base URL
echo ""
echo "🔗 Please enter your SSE base URL:"
echo "   Example: https://sse.example.com"
read -r sse_url

# Create the .env.local file
cat > .env.local << EOF
# API Configuration
NEXT_PUBLIC_API_BASE_URL=${api_url}
NEXT_PUBLIC_SSE_BASE_URL=${sse_url}

# Development Environment
NODE_ENV=development

# Generated on: $(date)
EOF

echo ""
echo "✅ Environment variables have been set up successfully!"
echo "📄 Created .env.local with the following configuration:"
echo ""
echo "   NEXT_PUBLIC_API_BASE_URL=${api_url}"
echo "   NEXT_PUBLIC_SSE_BASE_URL=${sse_url}"
echo "   NODE_ENV=development"
echo ""
echo "🎉 You can now run 'npm run dev' to start the development server"
echo ""
echo "💡 To deploy to AWS Amplify, make sure to set these environment variables"
echo "   in your Amplify console under 'Environment variables'" 