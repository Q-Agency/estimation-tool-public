# AWS Lambda PDF Generation Issues & Solutions

## 🔍 Problem Analysis

The PDF generation works perfectly in local development but fails when deployed to AWS Amplify due to several AWS Lambda limitations and environmental differences.

## 🚨 Root Causes

### 1. **Puppeteer Chrome Binary Missing**
- **Issue**: AWS Lambda doesn't include Chrome/Chromium by default
- **Local**: Uses system-installed Chrome
- **AWS**: No Chrome binary available, causing `puppeteer.launch()` to fail

### 2. **File System Access Differences**
- **Issue**: Public assets accessed differently in Lambda
- **Local**: `process.cwd()/public/` works fine
- **AWS**: Different file structure, assets may be in different locations

### 3. **Memory & Timeout Limitations**
- **Issue**: PDF generation is memory-intensive
- **Local**: No memory restrictions
- **AWS**: Lambda has memory limits (512MB-3GB) and 15-minute max execution time

### 4. **Package Dependencies**
- **Issue**: Standard `puppeteer` package includes Chrome binary but doesn't work in Lambda
- **Solution**: Use `puppeteer-core` + `@sparticuz/chromium`

## ✅ Solutions Implemented

### 1. **AWS-Compatible Puppeteer Setup**
```json
// package.json - Replaced standard puppeteer
{
  "dependencies": {
    "@sparticuz/chromium": "^131.0.0",
    "puppeteer-core": "^23.10.4"
  }
}
```

### 2. **Environment-Aware Browser Launch**
```typescript
// src/services/professionalPdfService.ts
private async getBrowser(): Promise<Browser> {
  const isLambda = !!process.env.AWS_LAMBDA_FUNCTION_NAME;
  
  if (isLambda) {
    // AWS Lambda configuration
    this.browser = await puppeteer.launch({
      args: [...chromium.args, '--no-sandbox'],
      defaultViewport: chromium.defaultViewport,
      executablePath: await chromium.executablePath(),
      headless: chromium.headless,
    });
  } else {
    // Local development
    this.browser = await puppeteer.launch({
      headless: true,
      args: ['--no-sandbox']
    });
  }
}
```

### 3. **Smart Asset Loading**
```typescript
// Fixed image loading for Lambda environment
private getImageAsBase64(imagePath: string): string {
  const isLambda = !!process.env.AWS_LAMBDA_FUNCTION_NAME;
  
  if (isLambda) {
    // Try multiple possible paths in Lambda
    const possiblePaths = [
      path.join(process.cwd(), 'public', imagePath),
      path.join('/var/task', 'public', imagePath),
      // ... other paths
    ];
    // Find the correct path
  }
}
```

### 4. **Next.js Lambda Optimization**
```typescript
// next.config.ts
experimental: {
  serverComponentsExternalPackages: ['@sparticuz/chromium', 'puppeteer-core'],
}
```

## 🎯 AWS Amplify Configuration

### Memory & Timeout Settings
**Note**: These must be configured in AWS Console, not in code:

1. **Go to AWS Lambda Console**
2. **Find your Amplify function** (usually named like `amplify-{app-name}-{env}-{hash}`)
3. **Configuration → General Configuration**
4. **Set Memory**: 2048 MB (for PDF generation)
5. **Set Timeout**: 30 seconds (for complex PDFs)

### Environment Variables
```bash
# Set in AWS Amplify Console → Environment Variables
AWS_LAMBDA_FUNCTION_NAME=true
NODE_ENV=production
```

## 🔧 Testing the Fix

### Local Testing
```bash
# Test locally (should work as before)
npm run dev
# Test PDF generation at: /api/generate-pdf
```

### AWS Testing
```bash
# After deployment, test:
# POST https://your-domain.com/api/generate-pdf
# With JSON body: { "content": "# Test PDF" }
```

## 📊 Performance Considerations

### Memory Usage
- **Puppeteer**: ~100-200MB base
- **Chrome**: ~200-400MB
- **PDF Generation**: +100-300MB per operation
- **Recommended**: 2048MB Lambda memory

### Timeout Considerations
- **Simple PDFs**: 5-10 seconds
- **Complex PDFs**: 15-30 seconds
- **Recommended**: 30 seconds timeout

## 🚀 Alternative Solutions

### Option 1: AWS Lambda Layers
```bash
# Use pre-built Chromium layer
arn:aws:lambda:us-east-1:764866452798:layer:chrome-aws-lambda:31
```

### Option 2: External PDF Service
- **Puppeteer as a Service**: Use third-party services
- **AWS Lambda**: Dedicated PDF generation function
- **Docker**: Deploy as container

### Option 3: Client-Side Generation
```javascript
// Fallback to client-side for simple PDFs
if (pdfGenerationFails) {
  // Use html2pdf.js as fallback
  await html2pdf(element).save('document.pdf');
}
```

## 📝 Monitoring & Debugging

### CloudWatch Logs
```bash
# Common error patterns to watch for:
# "Error: Could not find Chrome"
# "Error: Navigation timeout"
# "Error: Memory limit exceeded"
```

### Debug Environment
```typescript
// Add debug logging
console.log('Lambda environment:', {
  isLambda: !!process.env.AWS_LAMBDA_FUNCTION_NAME,
  memorySize: process.env.AWS_LAMBDA_FUNCTION_MEMORY_SIZE,
  timeout: process.env.AWS_LAMBDA_FUNCTION_TIMEOUT,
  chromeExecutable: await chromium.executablePath()
});
```

## 🏁 Deployment Checklist

- [ ] ✅ Updated package.json with AWS-compatible packages
- [ ] ✅ Modified puppeteer service for Lambda compatibility
- [ ] ✅ Updated Next.js config for external packages
- [ ] ✅ Added environment detection logic
- [ ] ✅ Improved asset loading for Lambda
- [ ] ⚠️ **TODO**: Set Lambda memory to 2048MB in AWS Console
- [ ] ⚠️ **TODO**: Set Lambda timeout to 30 seconds in AWS Console

## 🎉 Expected Results

After implementing these changes:
- **Local Development**: PDF generation works as before
- **AWS Amplify**: PDF generation should work with proper memory/timeout settings
- **Error Handling**: Better error messages and fallbacks
- **Performance**: Optimized for Lambda environment

## 📞 Support

If PDF generation still fails after these changes:
1. Check CloudWatch logs for specific error messages
2. Verify Lambda memory settings (should be 2048MB)
3. Confirm timeout settings (should be 30 seconds)
4. Test with simple PDF first, then complex ones 