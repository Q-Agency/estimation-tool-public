import { NextRequest, NextResponse } from 'next/server';
import { professionalPdfService } from '@/services/professionalPdfService';
import { convertMarkupToHtmlForPDF } from '@/utils/professionalMarkupConverter';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { content, options = {} } = body;

    if (!content) {
      return NextResponse.json(
        { error: 'Content is required' },
        { status: 400 }
      );
    }

    // Convert markdown to HTML
    const htmlContent = convertMarkupToHtmlForPDF(content);

    // Set default options for professional reports
    const pdfOptions = {
      title: 'Project Estimation Report',
      includeBackground: true,
      ...options
    };

    // Generate PDF using Puppeteer
    const pdfBuffer = await professionalPdfService.generatePDF(htmlContent, pdfOptions);

    // Return PDF as stream
    return new NextResponse(pdfBuffer, {
      status: 200,
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': `attachment; filename="${pdfOptions.filename || 'estimation-report.pdf'}"`,
        'Content-Length': pdfBuffer.length.toString(),
      },
    });

  } catch (error) {
    console.error('PDF generation error:', error);
    return NextResponse.json(
      { 
        error: 'Failed to generate PDF',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}

// Handle email sending with PDF attachment
export async function PUT(request: NextRequest) {
  try {
    const body = await request.json();
    const { content, email, options = {} } = body;

    if (!content || !email) {
      return NextResponse.json(
        { error: 'Content and email are required' },
        { status: 400 }
      );
    }

    // Convert markdown to HTML
    const htmlContent = convertMarkupToHtmlForPDF(content);

    // Create filename from RFP name if provided, otherwise use default
    const baseFilename = options.rfpFileName 
      ? options.rfpFileName.replace(/\.pdf$/i, '') 
      : 'estimation-report';
    const pdfFilename = `${baseFilename}-analysis-${new Date().toISOString().split('T')[0]}.pdf`;

    // Set default options for professional reports
    const pdfOptions = {
      title: 'Project Estimation Report',
      includeBackground: true,
      filename: pdfFilename,
      rfpFileName: options.rfpFileName || 'Unknown RFP',
      ...options
    };

    // Generate PDF using Puppeteer
    const pdfBuffer = await professionalPdfService.generatePDF(htmlContent, pdfOptions);

    // Create FormData for email service
    const formData = new FormData();
    formData.append('email', email);
    formData.append('pdf', new Blob([pdfBuffer], { type: 'application/pdf' }), pdfOptions.filename);

    // Send to email service (you'll need to implement this endpoint)
    const response = await fetch(`${process.env.NEXT_PUBLIC_API_BASE_URL || 'http://localhost:3000'}/api/send-email`, {
      method: 'POST',
      body: formData
    });

    if (response.ok) {
      return NextResponse.json({ success: true, message: 'PDF sent successfully' });
    } else {
      throw new Error('Failed to send email');
    }

  } catch (error) {
    console.error('Email sending error:', error);
    return NextResponse.json(
      { 
        error: 'Failed to send PDF via email',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
} 