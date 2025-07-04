import { en } from '@/lib/localization';

/**
 * Enhanced markup converter optimized for professional PDF generation
 * Includes proper page breaks, professional styling, and executive-level formatting
 */
export const convertMarkupToHtmlForPDF = (markup: string): string => {
  if (!markup) return '';
  
  let html = markup;
  
  // Handle executive summary sections with special styling
  html = html.replace(
    /<div class="executive-summary[^>]*>(.*?)<\/div>/gs,
    '<div class="executive-summary section no-break">$1</div>'
  );
  
  // Add section breaks for major headings
  html = html.replace(/^# (.*$)/gm, '<div class="section-break"></div><h1>$1</h1>');
  html = html.replace(/^## (.*$)/gm, '<h2>$1</h2>');
  html = html.replace(/^### (.*$)/gm, '<h3>$1</h3>');
  
  // Process professional tables with enhanced styling
  html = processEnhancedTables(html);
  
  // Handle highlight boxes and special sections
  html = processSpecialSections(html);
  
  // Format lists with better spacing
  html = processLists(html);
  
  // Replace bold and italic text with professional styling
  html = html.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>');
  html = html.replace(/\*(.*?)\*/g, '<em>$1</em>');
  
  // Replace links with professional styling
  html = html.replace(/\[(.*?)\]\((.*?)\)/g, '<a href="$2" class="professional-link">$1</a>');
  
  // Handle paragraphs with better spacing
  html = html.replace(/\n\n/g, '</p><p>');
  
  // Replace single newlines with line breaks
  html = html.replace(/\n/g, '<br>');
  
  // Wrap content that's not already wrapped
  if (!html.startsWith('<')) {
    html = '<p>' + html;
  }
  if (!html.endsWith('</p>')) {
    html = html + '</p>';
  }
  
  // Clean up any double paragraph tags
  html = html.replace(/<p><\/p>/g, '');
  html = html.replace(/<p>\s*<p>/g, '<p>');
  html = html.replace(/<\/p>\s*<\/p>/g, '</p>');
  
  return html;
};

/**
 * Process enhanced tables with professional styling and proper page breaks
 */
const processEnhancedTables = (html: string): string => {
  const tableRows = html.match(/^\|.*\|$/gm);
  
  if (!tableRows || tableRows.length === 0) {
    return html;
  }

  let processedHtml = html;
  let tableIndex = 0;

  while (true) {
    const currentTableRows = processedHtml.match(/^\|.*\|$/gm);
    if (!currentTableRows || tableIndex >= currentTableRows.length) break;

    // Find the start and end of this table
    const tableStartIndex = processedHtml.indexOf(currentTableRows[0]);
    let tableEndIndex = tableStartIndex;
         const consecutiveRows: string[] = [];
    
    for (let i = 0; i < currentTableRows.length; i++) {
      const rowIndex = processedHtml.indexOf(currentTableRows[i], tableEndIndex);
      if (rowIndex === tableEndIndex || (rowIndex - tableEndIndex < 100)) { // Allow for some whitespace
        consecutiveRows.push(currentTableRows[i]);
        tableEndIndex = rowIndex + currentTableRows[i].length;
      } else {
        break;
      }
    }

    if (consecutiveRows.length < 2) {
      tableIndex++;
      continue;
    }

    // Process this table
    const headerRow = consecutiveRows[0];
    const separatorExists = consecutiveRows[1] && consecutiveRows[1].includes('---');
    const dataRows = separatorExists ? consecutiveRows.slice(2) : consecutiveRows.slice(1);
    
    if (dataRows.length === 0) {
      tableIndex++;
      continue;
    }

    // Extract headers
    const headers = headerRow.split('|')
      .filter(cell => cell.trim() !== '')
      .map(cell => cell.trim());

    // Create professional table HTML
    let tableHtml = '<div class="section no-break"><table class="professional-table">';
    
    // Add table header
    tableHtml += '<thead><tr>';
    headers.forEach(header => {
      tableHtml += `<th>${header}</th>`;
    });
    tableHtml += '</tr></thead>';
    
         // Add table body
     tableHtml += '<tbody>';
     dataRows.forEach((row) => {
      const cells = row.split('|')
        .filter(cell => cell.trim() !== '')
        .map(cell => cell.trim());
      
      // Check if this is a total/summary row
      const isTotalRow = cells[0] && (
        cells[0].toLowerCase().includes('total') || 
        cells[0].toLowerCase().includes('summary') ||
        cells[0].toLowerCase().includes('investment')
      );
      
      const rowClass = isTotalRow ? 'table-total' : '';
      tableHtml += `<tr class="${rowClass}">`;
      
      cells.forEach((cell, cellIndex) => {
        // Ensure we don't exceed the number of headers
        if (cellIndex < headers.length) {
          tableHtml += `<td>${cell}</td>`;
        }
      });
      
      // Fill in missing cells if row has fewer cells than headers
      for (let i = cells.length; i < headers.length; i++) {
        tableHtml += '<td></td>';
      }
      
      tableHtml += '</tr>';
    });
    
    tableHtml += '</tbody></table></div>';

    // Replace the original table with the enhanced HTML table
    const originalTable = processedHtml.substring(tableStartIndex, tableEndIndex);
    processedHtml = processedHtml.replace(originalTable, tableHtml);
    
    tableIndex++;
  }

  return processedHtml;
};

/**
 * Process special sections like highlights, risks, and success boxes
 */
const processSpecialSections = (html: string): string => {
  // Highlight boxes
  html = html.replace(
    /<div class="highlight-box[^>]*>(.*?)<\/div>/gs,
    '<div class="highlight-box no-break">$1</div>'
  );
  
  // Risk assessments
  html = html.replace(
    /\*\*RISK\*\*(.*?)(?=\*\*|$)/gs,
    '<div class="risk-box no-break"><strong>RISK:</strong>$1</div>'
  );
  
  // Success factors
  html = html.replace(
    /\*\*SUCCESS\*\*(.*?)(?=\*\*|$)/gs,
    '<div class="success-box no-break"><strong>SUCCESS:</strong>$1</div>'
  );
  
  // Recommendations
  html = html.replace(
    /\*\*RECOMMENDATION\*\*(.*?)(?=\*\*|$)/gs,
    '<div class="highlight-box no-break"><strong>RECOMMENDATION:</strong>$1</div>'
  );
  
  return html;
};

/**
 * Process lists with better formatting for PDF
 */
const processLists = (html: string): string => {
  // Handle unordered lists
  html = html.replace(/^\s*[-*+]\s+(.*$)/gm, '<li class="list-item">$1</li>');
  
  // Handle ordered lists
  html = html.replace(/^\s*\d+\.\s+(.*$)/gm, '<li class="list-item numbered">$1</li>');
  
  // Wrap consecutive list items in ul/ol tags
  html = html.replace(
    /(<li class="list-item"(?!.*numbered)>.*?<\/li>)(?:\s*<li class="list-item"(?!.*numbered)>.*?<\/li>)*/gs,
    '<ul class="professional-list">$&</ul>'
  );
  
  html = html.replace(
    /(<li class="list-item numbered">.*?<\/li>)(?:\s*<li class="list-item numbered">.*?<\/li>)*/gs,
    '<ol class="professional-list">$&</ol>'
  );
  
  // Clean up list item classes within wrapped lists
  html = html.replace(/class="list-item numbered"/g, '');
  html = html.replace(/class="list-item"/g, '');
  
  return html;
};

/**
 * Add table of contents generation
 */
export const generateTableOfContents = (html: string): string => {
  const headings = html.match(/<h[123][^>]*>(.*?)<\/h[123]>/g) || [];
  
  if (headings.length === 0) return '';
  
  let toc = '<div class="table-of-contents section-break no-break">';
  toc += `<h1>${en.pdf.tableOfContents}</h1>`;
  toc += '<div class="toc-list">';
  
  headings.forEach((heading, index) => {
    const level = heading.charAt(2); // h1, h2, or h3
    const text = heading.replace(/<[^>]*>/g, '').trim();
    const id = `section-${index + 1}`;
    
    // Add ID to the original heading for linking
    const headingWithId = heading.replace('>', ` id="${id}">`);
    html = html.replace(heading, headingWithId);
    
    const indent = level === '1' ? '' : level === '2' ? 'margin-left: 20pt;' : 'margin-left: 40pt;';
    toc += `<div class="toc-item" style="${indent}"><a href="#${id}" class="toc-link">${text}</a></div>`;
  });
  
  toc += '</div></div>';
  
  return toc + html;
};

/**
 * Add executive summary if not present
 */
export const ensureExecutiveSummary = (html: string): string => {
  if (html.includes('executive-summary') || html.includes('Executive Summary')) {
    return html;
  }
  
  // Extract first paragraph or section as summary
  const firstParagraph = html.match(/<p[^>]*>(.*?)<\/p>/s);
  if (firstParagraph) {
    const summary = `
      <div class="executive-summary section no-break">
        <h2>${en.pdf.executiveSummary}</h2>
        ${firstParagraph[0]}
      </div>
    `;
    return summary + html;
  }
  
  return html;
}; 