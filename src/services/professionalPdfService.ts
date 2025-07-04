import puppeteer, { Browser } from 'puppeteer-core';
import chromium from '@sparticuz/chromium';
import fs from 'fs';
import path from 'path';

export interface PdfGenerationOptions {
  title?: string;
  author?: string;
  subject?: string;
  filename?: string;
  rfpFileName?: string;
  includeBackground?: boolean;
  margins?: {
    top?: string;
    bottom?: string;
    left?: string;
    right?: string;
  };
}

export class ProfessionalPdfService {
  private static instance: ProfessionalPdfService;
  private browser: Browser | null = null;

  public static getInstance(): ProfessionalPdfService {
    if (!ProfessionalPdfService.instance) {
      ProfessionalPdfService.instance = new ProfessionalPdfService();
    }
    return ProfessionalPdfService.instance;
  }

  private async getBrowser(): Promise<Browser> {
    if (!this.browser) {
      // Check if we're in AWS Lambda environment
      const isLambda = !!process.env.AWS_LAMBDA_FUNCTION_NAME;
      
      if (isLambda) {
        // AWS Lambda configuration
        this.browser = await puppeteer.launch({
          args: [
            ...chromium.args,
            '--no-sandbox',
            '--disable-setuid-sandbox',
            '--disable-dev-shm-usage',
            '--disable-web-security',
            '--font-render-hinting=none',
            '--disable-features=VizDisplayCompositor'
          ],
          defaultViewport: chromium.defaultViewport,
          executablePath: await chromium.executablePath(),
          headless: chromium.headless,
        });
      } else {
        // Local development configuration
        this.browser = await puppeteer.launch({
          headless: true,
          args: [
            '--no-sandbox',
            '--disable-setuid-sandbox',
            '--disable-dev-shm-usage',
            '--disable-web-security',
            '--font-render-hinting=none',
            '--disable-features=VizDisplayCompositor'
          ]
        });
      }
    }
    return this.browser;
  }

  public async generatePDF(
    htmlContent: string, 
    options: PdfGenerationOptions = {}
  ): Promise<Buffer> {
    const browser = await this.getBrowser();
    const page = await browser.newPage();

    try {
      // Set viewport for consistent rendering
      await page.setViewport({ 
        width: 1200, 
        height: 1600, 
        deviceScaleFactor: 2 
      });

      // Enhanced HTML template with professional CSS
      const professionalHTML = this.createProfessionalHTML(htmlContent, options);

      // Set content and wait for fonts and images to load
      await page.setContent(professionalHTML, { 
        waitUntil: 'networkidle0',
        timeout: 30000 
      });

      // Wait a bit more for fonts to fully load
      await new Promise(resolve => setTimeout(resolve, 1000));

      // Generate PDF with professional settings
      const pdf = await page.pdf({
        format: 'A4',
        printBackground: options.includeBackground !== false,
        preferCSSPageSize: true,
        displayHeaderFooter: true,
        headerTemplate: this.getHeaderTemplate(options),
        footerTemplate: this.getFooterTemplate(),
        margin: {
          top: options.margins?.top || '1.2in',
          bottom: options.margins?.bottom || '1in',
          left: options.margins?.left || '0.8in',
          right: options.margins?.right || '0.8in'
        }
      });

      return Buffer.from(pdf);
    } finally {
      await page.close();
    }
  }

  private createProfessionalHTML(content: string, options: PdfGenerationOptions): string {
    return `
      <!DOCTYPE html>
      <html lang="en">
      <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>${options.title || 'Project Estimation Report'}</title>
        <link href="https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700&display=swap" rel="stylesheet">
        <style>
          ${this.getProfessionalCSS()}
        </style>
      </head>
      <body>
        <div class="document-container">
          ${this.addCoverPage(options)}
          <div class="content-wrapper">
            ${content}
          </div>
        </div>
      </body>
      </html>
    `;
  }

  private addCoverPage(options: PdfGenerationOptions): string {
    const currentDate = new Date().toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });

    // Get base64 versions of the images
    const qLogoBase64 = this.getImageAsBase64('Q.png');
    const aiPoweredBase64 = this.getImageAsBase64('ai_powered.png');

    return `
      <div class="cover-page section-break">
        <div class="cover-content">
          <div class="cover-header">
            <div class="logo-section">
              ${qLogoBase64 ? `<img src="${qLogoBase64}" alt="Q Logo" class="company-logo" />` : '<div class="logo-placeholder">Q</div>'}
              <h1 class="company-name">Estimation Tool</h1>
            </div>
          </div>
          
          <div class="cover-main">
            ${aiPoweredBase64 ? `<img src="${aiPoweredBase64}" alt="AI Powered" class="ai-powered-image" />` : ''}
            <h1 class="cover-title">${options.title || 'Project Estimation Report'}</h1>
            <div class="cover-subtitle">Basic Analysis & Recommendations</div>
            
            <div class="cover-details">
              <div class="detail-item">
                <span class="detail-label">RFP Document:</span>
                <span class="detail-value">${options.rfpFileName || 'Unknown RFP'}</span>
              </div>
              <div class="detail-item">
                <span class="detail-label">Generated:</span>
                <span class="detail-value">${currentDate}</span>
              </div>
              <div class="detail-item">
                <span class="detail-label">Document Type:</span>
                <span class="detail-value">Basic RFP Analysis</span>
              </div>
            </div>
          </div>
          
          <div class="cover-footer">
            <div class="disclaimer">
              This document contains AI-generated analysis and recommendations based on the uploaded RFP. 
              Please review all details carefully before making business decisions.
            </div>
          </div>
        </div>
      </div>
    `;
  }

  private getHeaderTemplate(options: PdfGenerationOptions): string {
    return `
      <div style="font-size: 9pt; color: #6b7280; text-align: center; width: 100%; margin: 0 20px;">
        <div style="border-bottom: 0.5pt solid #e5e7eb; padding-bottom: 8pt; margin-top: 12pt;">
          <span style="font-weight: 600;">${options.title || 'Project Estimation Report'}</span>
          <span style="float: right; font-weight: 400;">Generated ${new Date().toLocaleDateString()}</span>
        </div>
      </div>
    `;
  }

  private getFooterTemplate(): string {
    return `
      <div style="font-size: 8pt; color: #6b7280; text-align: center; width: 100%; margin: 0 20px;">
        <div style="border-top: 0.5pt solid #e5e7eb; padding-top: 6pt; margin-bottom: 8pt;">
          <span style="float: left;">Basic Analysis</span>
          <span>Page <span class="pageNumber"></span> of <span class="totalPages"></span></span>
          <span style="float: right;">Q - AI Estimation Tool</span>
        </div>
      </div>
    `;
  }

  public async closeBrowser(): Promise<void> {
    if (this.browser) {
      await this.browser.close();
      this.browser = null;
    }
  }

  private getProfessionalCSS(): string {
    return `
      /* Page Setup */
      @page {
        size: A4;
        margin: 1.2in 0.8in 1in 0.8in;
      }

      @page :first {
        margin: 0.8in 0.6in 0.8in 0.6in;
      }

      * {
        box-sizing: border-box;
        -webkit-print-color-adjust: exact;
        print-color-adjust: exact;
      }

      body {
        font-family: 'Inter', 'Segoe UI', system-ui, -apple-system, sans-serif;
        font-size: 10pt;
        line-height: 1.5;
        color: #1a1a1a;
        margin: 0;
        padding: 0;
        background: white;
      }

      .document-container {
        max-width: 100%;
      }

      /* Cover Page Styles */
      .cover-page {
        height: 100%;
        max-height: calc(11.7in - 1.6in); /* A4 height minus first page margins */
        display: flex;
        flex-direction: column;
        background: white;
        color: #374151;
        page-break-after: always;
        border: 1pt solid #e5e7eb;
        border-radius: 8pt;
        overflow: hidden;
      }

      .cover-content {
        flex: 1;
        display: flex;
        flex-direction: column;
        justify-content: space-between;
        padding: 40pt 30pt;
        max-height: calc(11.7in - 1.6in);
      }

      .cover-header {
        text-align: center;
      }

      .logo-section {
        display: flex;
        align-items: center;
        justify-content: center;
        margin-bottom: 30pt;
      }

      .company-logo {
        width: 40pt;
        height: 40pt;
        margin-right: 12pt;
        border-radius: 6pt;
        object-fit: contain;
        background: #f8fafc;
        padding: 6pt;
        border: 1pt solid #e2e8f0;
      }

      .logo-placeholder {
        width: 40pt;
        height: 40pt;
        background: #f1f5f9;
        border: 1pt solid #cbd5e1;
        border-radius: 6pt;
        display: flex;
        align-items: center;
        justify-content: center;
        font-size: 16pt;
        font-weight: 700;
        margin-right: 12pt;
        color: #475569;
      }

      .company-name {
        font-size: 20pt;
        font-weight: 600;
        margin: 0;
        color: #1e40af;
      }

      .cover-main {
        text-align: center;
        flex: 1;
        display: flex;
        flex-direction: column;
        justify-content: center;
        padding: 20pt 0;
      }

      .ai-powered-image {
        width: 100pt;
        height: auto;
        margin: 0 auto 20pt auto;
        max-width: 150pt;
      }

      .cover-title {
        font-size: 28pt;
        font-weight: 700;
        margin: 0 0 12pt 0;
        line-height: 1.2;
        color: #1e40af;
      }

      .cover-subtitle {
        font-size: 14pt;
        font-weight: 400;
        margin-bottom: 30pt;
        color: #6b7280;
      }

      .cover-details {
        background: #f8fafc;
        border: 1pt solid #e2e8f0;
        border-radius: 8pt;
        padding: 20pt;
        margin: 0 auto;
        max-width: 350pt;
        box-shadow: 0 2pt 4px rgba(0, 0, 0, 0.1);
      }

      .detail-item {
        display: flex;
        justify-content: space-between;
        align-items: center;
        margin-bottom: 10pt;
        font-size: 10pt;
      }

      .detail-item:last-child {
        margin-bottom: 0;
      }

      .detail-label {
        font-weight: 500;
        color: #6b7280;
      }

      .detail-value {
        font-weight: 600;
        color: #374151;
      }

      .cover-footer {
        text-align: center;
        font-size: 8pt;
        color: #9ca3af;
        margin-top: 20pt;
      }

      .disclaimer {
        background: #f9fafb;
        border: 1pt solid #f3f4f6;
        padding: 10pt;
        border-radius: 4pt;
        color: #6b7280;
        line-height: 1.4;
      }

      /* Content Wrapper */
      .content-wrapper {
        padding: 20pt 0;
      }

      /* Professional Typography with Enhanced Pagination */
      h1 {
        font-size: 20pt;
        font-weight: 700;
        color: #2563eb;
        margin: 24pt 0 16pt 0;
        page-break-after: avoid;
        page-break-inside: avoid;
        orphans: 4;
        widows: 4;
        line-height: 1.2;
        border-bottom: 1pt solid #e5e7eb;
        padding-bottom: 8pt;
      }

      /* Ensure h1 stays with following content */
      h1 + * {
        page-break-before: avoid;
        margin-top: 0 !important;
      }

      h2 {
        font-size: 16pt;
        font-weight: 600;
        color: #1e40af;
        margin: 20pt 0 12pt 0;
        page-break-after: avoid;
        page-break-inside: avoid;
        orphans: 4;
        widows: 4;
        position: relative;
        padding-left: 12pt;
      }

      /* Ensure h2 stays with following content */
      h2 + * {
        page-break-before: avoid;
        margin-top: 0 !important;
      }

      h2::before {
        content: '';
        position: absolute;
        left: 0;
        top: 50%;
        transform: translateY(-50%);
        width: 4pt;
        height: 16pt;
        background: #2563eb;
        border-radius: 2pt;
      }

      h3 {
        font-size: 12pt;
        font-weight: 600;
        color: #374151;
        margin: 16pt 0 8pt 0;
        page-break-after: avoid;
        page-break-inside: avoid;
        orphans: 3;
        widows: 3;
      }

      /* Ensure h3 stays with following content */
      h3 + * {
        page-break-before: avoid;
        margin-top: 0 !important;
      }

      /* Additional heading levels */
      h4, h5, h6 {
        page-break-after: avoid;
        page-break-inside: avoid;
        orphans: 3;
        widows: 3;
        margin-top: 14pt;
        margin-bottom: 6pt;
      }

      /* Ensure all headings stay with their content */
      h4 + *, h5 + *, h6 + * {
        page-break-before: avoid;
        margin-top: 0 !important;
      }

      p {
        margin: 0 0 10pt 0;
        text-align: justify;
        orphans: 3;
        widows: 3;
        page-break-inside: avoid;
      }

      /* Enhanced section grouping */
      .content-section {
        page-break-inside: avoid;
        margin-bottom: 20pt;
      }

      /* Better content flow */
      .keep-together {
        page-break-inside: avoid;
      }

      /* Professional Tables */
      table {
        width: 100%;
        border-collapse: collapse;
        margin: 16pt 0 20pt 0;
        page-break-inside: auto;
        font-size: 9pt;
        box-shadow: 0 2pt 4px rgba(0, 0, 0, 0.1);
        border-radius: 4pt;
        overflow: hidden;
      }

      thead {
        display: table-header-group;
      }

      tr {
        page-break-inside: avoid;
        page-break-after: auto;
      }

      th {
        background: linear-gradient(135deg, #f8fafc 0%, #e2e8f0 100%);
        color: #374151;
        font-weight: 600;
        padding: 12pt 15pt;
        text-align: left;
        border-bottom: 2pt solid #2563eb;
        font-size: 9pt;
        text-transform: uppercase;
        letter-spacing: 0.025em;
        position: relative;
      }

      td {
        padding: 10pt 15pt;
        border-bottom: 0.5pt solid #e5e7eb;
        vertical-align: top;
      }

      /* Table alternating rows */
      tbody tr:nth-child(even) {
        background-color: #fafbfc;
      }

      tbody tr:hover {
        background-color: #f1f5f9;
      }

      /* Special table rows */
      .table-total td {
        background-color: #eff6ff !important;
        font-weight: 600;
        border-top: 2pt solid #2563eb;
        color: #1e40af;
      }

      /* Professional spacing and page breaks */
      .section-break {
        page-break-before: always;
      }

      .no-break {
        page-break-inside: avoid;
      }

      .section {
        margin-bottom: 24pt;
      }

      /* Executive summary styling */
      .executive-summary {
        background: linear-gradient(135deg, #f8fafc 0%, #e2e8f0 100%);
        border-left: 4pt solid #2563eb;
        border-radius: 0 8pt 8pt 0;
        padding: 20pt;
        margin: 20pt 0;
        page-break-inside: avoid;
        box-shadow: 0 2pt 8px rgba(0, 0, 0, 0.1);
      }

      /* Highlight boxes */
      .highlight-box {
        background: linear-gradient(135deg, #eff6ff 0%, #dbeafe 100%);
        border: 1pt solid #bfdbfe;
        border-radius: 8pt;
        padding: 16pt;
        margin: 16pt 0;
        page-break-inside: avoid;
        box-shadow: 0 2pt 4px rgba(59, 130, 246, 0.1);
      }

      .risk-box {
        background: linear-gradient(135deg, #fef2f2 0%, #fee2e2 100%);
        border: 1pt solid #fecaca;
        border-left: 4pt solid #dc2626;
        border-radius: 0 8pt 8pt 0;
        padding: 16pt;
        margin: 16pt 0;
        page-break-inside: avoid;
      }

      .success-box {
        background: linear-gradient(135deg, #f0fdf4 0%, #dcfce7 100%);
        border: 1pt solid #bbf7d0;
        border-left: 4pt solid #16a34a;
        border-radius: 0 8pt 8pt 0;
        padding: 16pt;
        margin: 16pt 0;
        page-break-inside: avoid;
      }

      /* Professional lists with enhanced pagination */
      ul, ol {
        margin: 8pt 0 16pt 0;
        padding-left: 20pt;
        page-break-before: avoid;
        page-break-inside: avoid;
        orphans: 3;
        widows: 3;
      }

      /* Keep nested lists together */
      ul ul, ol ol, ul ol, ol ul {
        margin: 4pt 0;
        page-break-before: avoid;
      }

      li {
        margin-bottom: 6pt;
        page-break-inside: avoid;
        line-height: 1.4;
        orphans: 2;
        widows: 2;
      }

      /* Prevent single list item at bottom of page */
      li:last-child {
        page-break-inside: avoid;
        orphans: 2;
      }

      /* Strong emphasis */
      strong {
        font-weight: 600;
        color: #1e40af;
      }

      /* Code and technical terms */
      code {
        background-color: #f1f5f9;
        padding: 2pt 4pt;
        border-radius: 2pt;
        font-family: 'Monaco', 'Menlo', monospace;
        font-size: 9pt;
        color: #334155;
      }

      /* Blockquotes */
      blockquote {
        border-left: 4pt solid #e5e7eb;
        padding-left: 16pt;
        margin: 16pt 0;
        font-style: italic;
        color: #6b7280;
        page-break-inside: avoid;
        orphans: 3;
        widows: 3;
      }

      /* Enhanced pagination for content blocks */
      div {
        orphans: 3;
        widows: 3;
      }

      /* Prevent breaking in the middle of important content */
      .important-section {
        page-break-inside: avoid;
        margin: 16pt 0;
      }

      /* Force content to stay together */
      .no-break-section {
        page-break-inside: avoid;
        page-break-before: avoid;
      }

      /* Footer content styling */
      .footer-content {
        font-size: 8pt;
        color: #6b7280;
        text-align: center;
        border-top: 0.5pt solid #e5e7eb;
        padding-top: 4pt;
      }

      /* Print optimizations */
      @media print {
        body {
          -webkit-print-color-adjust: exact;
          print-color-adjust: exact;
        }
        
        .no-print {
          display: none !important;
        }
      }
    `
  }

  private getImageAsBase64(imagePath: string): string {
    try {
      // Check if we're in AWS Lambda environment
      const isLambda = !!process.env.AWS_LAMBDA_FUNCTION_NAME;
      
      let fullPath: string;
      if (isLambda) {
        // In Lambda, try different possible paths
        const possiblePaths = [
          path.join(process.cwd(), 'public', imagePath),
          path.join(process.cwd(), '.next', 'static', imagePath),
          path.join('/var/task', 'public', imagePath),
          path.join('/var/task/.next/static', imagePath)
        ];
        
        let imageBuffer: Buffer | null = null;
        for (const testPath of possiblePaths) {
          try {
            if (fs.existsSync(testPath)) {
              imageBuffer = fs.readFileSync(testPath);
              break;
            }
          } catch (e) {
            // Continue to next path
          }
        }
        
        if (!imageBuffer) {
          console.warn(`Could not find image ${imagePath} in Lambda environment`);
          return '';
        }
        
        const base64 = imageBuffer.toString('base64');
        const mimeType = imagePath.endsWith('.png') ? 'image/png' : 'image/jpeg';
        return `data:${mimeType};base64,${base64}`;
      } else {
        // Local development
        fullPath = path.join(process.cwd(), 'public', imagePath);
        const imageBuffer = fs.readFileSync(fullPath);
        const base64 = imageBuffer.toString('base64');
        const mimeType = imagePath.endsWith('.png') ? 'image/png' : 'image/jpeg';
        return `data:${mimeType};base64,${base64}`;
      }
    } catch (error) {
      console.error(`Error loading image ${imagePath}:`, error);
      return '';
    }
  }
}

export const professionalPdfService = ProfessionalPdfService.getInstance();