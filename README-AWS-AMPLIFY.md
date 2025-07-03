# AWS Amplify Deployment Guide

This guide walks you through deploying the Estimation Tool SSE Client to AWS Amplify.

## Prerequisites

- AWS Account with Amplify access
- GitHub repository (already set up at https://github.com/Q-Agency/estimation-tool-public.git)
- Your API and SSE endpoints ready

## Quick Deploy to AWS Amplify

1. **Connect to AWS Amplify**
   - Go to [AWS Amplify Console](https://console.aws.amazon.com/amplify/)
   - Click "New app" → "Host web app"
   - Choose "GitHub" as source
   - Select your repository: `Q-Agency/estimation-tool-public`
   - Choose the `main` branch

2. **Configure Build Settings**
   - Amplify will automatically detect the `amplify.yml` file
   - Build settings are pre-configured for optimal performance

3. **Set Environment Variables**
   - In the Amplify console, go to "Environment variables"
   - Add the following variables:
   ```
   NEXT_PUBLIC_API_BASE_URL=https://your-api-endpoint.com/api
   NEXT_PUBLIC_SSE_BASE_URL=https://your-sse-endpoint.com
   NODE_ENV=production
   ```

4. **Deploy**
   - Click "Save and deploy"
   - Amplify will automatically build and deploy your app

## Configuration Files

### `amplify.yml`
- **Build Configuration**: Optimized for Next.js 15
- **Caching**: Configured for `node_modules` and `.next/cache`
- **Security Headers**: Includes security headers for production
- **Performance**: Optimized build process

### `next.config.ts`
- **Standalone Output**: Optimized for serverless deployment
- **Environment Variables**: Properly configured for Amplify
- **Security Headers**: Enhanced security configuration
- **Image Optimization**: Configured for WebP and AVIF formats
- **Production Optimizations**: Console removal and package optimization

## Environment Variables

| Variable | Description | Example |
|----------|-------------|---------|
| `NEXT_PUBLIC_API_BASE_URL` | Your API endpoint | `https://api.example.com/api` |
| `NEXT_PUBLIC_SSE_BASE_URL` | Your SSE endpoint | `https://sse.example.com` |
| `NODE_ENV` | Environment mode | `production` |

## Features Included

✅ **Automatic Deployments**: Deploys on every push to main branch  
✅ **Performance Optimization**: Image optimization and caching  
✅ **Security Headers**: HSTS, CSP, and other security measures  
✅ **Error Handling**: Comprehensive error handling with modern UI  
✅ **SSE Management**: Real-time connection management  
✅ **Modern UI**: Glass morphism and animations  

## Post-Deployment

1. **Test your deployment**
   - Verify the app loads correctly
   - Test file upload functionality
   - Check SSE connection status
   - Verify error handling works

2. **Monitor performance**
   - Use AWS CloudWatch for monitoring
   - Check Amplify build logs for any issues
   - Monitor SSE connection stability

3. **Custom Domain (Optional)**
   - Add your custom domain in Amplify console
   - Configure SSL certificate
   - Update DNS records

## Troubleshooting

### Build Fails
- Check environment variables are set correctly
- Verify your API endpoints are accessible
- Check build logs in Amplify console

### SSE Connection Issues
- Verify CORS settings on your SSE endpoint
- Check if the SSE endpoint supports the required headers
- Ensure the SSE endpoint is accessible from the deployed domain

### Performance Issues
- Enable CloudFront CDN (automatically done by Amplify)
- Optimize images and assets
- Check Next.js bundle analyzer for large dependencies

## Support

For issues with the deployment:
1. Check AWS Amplify documentation
2. Review build logs in the Amplify console
3. Verify environment variables and API endpoints
4. Check the GitHub repository for updates

## Costs

AWS Amplify pricing includes:
- **Build time**: Pay per build minute
- **Data transfer**: Pay per GB served
- **Storage**: Pay per GB stored
- **Free tier**: 1000 build minutes and 15GB served per month

Estimated cost for typical usage: $5-15/month depending on traffic. 