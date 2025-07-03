/**
 * Converts markdown-style markup to HTML with inline styles
 */
export const convertMarkupToHtml = (markup: string): string => {
  if (!markup) return '';
  
  // Replace markdown-style headers
  let html = markup.replace(/^# (.*$)/gm, '<h1 style="font-size: 1.5rem; font-weight: 600; margin-bottom: 1rem; color: rgb(31, 41, 55); font-family: \'Inter\', system-ui, -apple-system, sans-serif;">$1</h1>');
  html = html.replace(/^## (.*$)/gm, '<h2 style="font-size: 1.25rem; font-weight: 600; margin-bottom: 0.75rem; color: rgb(31, 41, 55); font-family: \'Inter\', system-ui, -apple-system, sans-serif;">$1</h2>');
  html = html.replace(/^### (.*$)/gm, '<h3 style="font-size: 1.125rem; font-weight: 600; margin-bottom: 0.75rem; color: rgb(31, 41, 55); font-family: \'Inter\', system-ui, -apple-system, sans-serif;">$1</h3>');
  
  // Replace bold and italic text
  html = html.replace(/\*\*(.*?)\*\*/g, '<strong style="font-weight: 600; color: rgb(31, 41, 55);">$1</strong>');
  html = html.replace(/\*(.*?)\*/g, '<em style="color: rgb(75, 85, 99);">$1</em>');
  
  // Replace lists
  html = html.replace(/^\s*[-*+]\s+(.*$)/gm, '<li style="margin-left: 1.5rem; color: rgb(55, 65, 81); font-family: \'Inter\', system-ui, -apple-system, sans-serif;">$1</li>');
  
  // Fix the regex to avoid using the 's' flag which requires ES2018
  const listItems = html.match(/<li style="margin-left: 1.5rem;.*?<\/li>/g);
  if (listItems && listItems.length > 0) {
    const listContent = listItems.join('');
    html = html.replace(listContent, `<ul style="list-style-type: disc; padding-left: 1.5rem; margin-bottom: 1rem; color: rgb(55, 65, 81);">${listContent}</ul>`);
  }
  
  // Replace links
  html = html.replace(/\[(.*?)\]\((.*?)\)/g, '<a href="$2" style="color: rgb(75, 85, 99); text-decoration: underline; font-weight: 500;" target="_blank" rel="noopener noreferrer">$1</a>');
  
  // Handle markdown tables
  html = processMarkdownTables(html);
  
  // Replace paragraphs (double newlines)
  html = html.replace(/\n\n/g, '</p><p style="margin-bottom: 1rem; color: rgb(55, 65, 81); font-family: \'Inter\', system-ui, -apple-system, sans-serif;">');
  
  // Replace single newlines with line breaks
  html = html.replace(/\n/g, '<br>');
  
  // Wrap in paragraph tags if not already wrapped
  if (!html.startsWith('<p')) {
    html = '<p style="margin-bottom: 1rem; color: rgb(55, 65, 81); font-family: \'Inter\', system-ui, -apple-system, sans-serif;">' + html;
  }
  if (!html.endsWith('</p>')) {
    html = html + '</p>';
  }
  
  return html;
};

/**
 * Processes markdown tables and converts them to HTML
 */
const processMarkdownTables = (html: string): string => {
  const tableRows = html.match(/^\|.*\|$/gm);
  
  if (!tableRows || tableRows.length === 0) {
    return html;
  }

  // Find the table boundaries
  const tableStartIndex = html.indexOf(tableRows[0]);
  const tableEndIndex = html.indexOf(tableRows[tableRows.length - 1]) + tableRows[tableRows.length - 1].length;
  
  // Extract the table content
  let tableContent = html.substring(tableStartIndex, tableEndIndex);
  
  // Process the table
  const rows = tableContent.split('\n').filter(row => row.trim() !== '');
  
  // Skip the separator row (the one with dashes)
  const headerRow = rows[0];
  const dataRows = rows.slice(2);
  
  // Extract headers
  const headers = headerRow.split('|').filter(cell => cell.trim() !== '').map(cell => cell.trim());
  
  // Create responsive table HTML that fits within screen width
  let tableHtml = '<div style="page-break-before: always; margin: 1.5rem 0; border: 1px solid rgb(229, 231, 235); border-radius: 0.5rem; box-shadow: 0 1px 2px 0 rgba(0, 0, 0, 0.05); background-color: rgb(255, 255, 255); font-family: \'Inter\', system-ui, -apple-system, sans-serif;"><table style="width: 100%; border-collapse: separate; border-spacing: 0; table-layout: fixed;">';
  
  // Add table header
  tableHtml += '<thead>';
  tableHtml += '<tr style="background-color: rgb(249, 250, 251); border-bottom: 1px solid rgb(229, 231, 235);">';
  headers.forEach(header => {
    tableHtml += `<th style="padding: 0.875rem 1.25rem; text-align: left; font-size: 0.875rem; font-weight: 600; text-transform: uppercase; letter-spacing: 0.05em; color: rgb(31, 41, 55); border-right: 1px solid rgb(229, 231, 235);">${header}</th>`;
  });
  tableHtml += '</tr>';
  tableHtml += '</thead>';
  
  // Add table body
  tableHtml += '<tbody style="background-color: rgb(255, 255, 255);">';
  dataRows.forEach((row, rowIndex) => {
    const cells = row.split('|').filter(cell => cell.trim() !== '').map(cell => cell.trim());
    
    // Check if this is the total row
    const isTotalRow = cells[0].includes('Total') || cells[0].includes('total');
    
    tableHtml += `<tr style="${isTotalRow ? 'background-color: rgb(249, 250, 251);' : rowIndex % 2 === 0 ? 'background-color: rgb(255, 255, 255);' : 'background-color: rgb(249, 250, 251);'} border-bottom: 1px solid rgb(229, 231, 235);">`;
    cells.forEach((cell, cellIndex) => {
      const isLastCell = cellIndex === cells.length - 1;
      tableHtml += `<td style="padding: 0.875rem 1.25rem; word-wrap: break-word; overflow-wrap: break-word; font-size: 0.875rem; ${isTotalRow ? 'font-weight: 600; color: rgb(31, 41, 55);' : 'color: rgb(55, 65, 81);'} ${!isLastCell ? 'border-right: 1px solid rgb(229, 231, 235);' : ''}">${cell}</td>`;
    });
    tableHtml += '</tr>';
  });
  tableHtml += '</tbody>';
  tableHtml += '</table></div>';
  
  // Replace the original table with the HTML table
  return html.substring(0, tableStartIndex) + tableHtml + html.substring(tableEndIndex);
}; 