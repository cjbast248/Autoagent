/**
 * Utility functions for exporting chart data to CSV and Excel formats
 */

export interface ChartDataPoint {
  label: string;
  minutes: number;
  calls?: number;
  avgDuration?: number;
  estimatedCost?: number;
}

/**
 * Convert chart data to CSV format
 */
export const exportToCSV = (data: ChartDataPoint[], filename: string = 'voice-chart-data.csv') => {
  if (!data || data.length === 0) {
    console.error('No data to export');
    return;
  }

  // Create CSV header
  const headers = ['Period', 'Minutes', 'Calls', 'Avg Duration (min)', 'Estimated Cost ($)'];
  
  // Create CSV rows
  const rows = data.map(point => [
    point.label,
    point.minutes.toString(),
    point.calls?.toString() || '0',
    point.avgDuration?.toFixed(2) || '0',
    point.estimatedCost?.toFixed(4) || '0'
  ]);

  // Combine headers and rows
  const csvContent = [
    headers.join(','),
    ...rows.map(row => row.join(','))
  ].join('\n');

  // Create blob and download
  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const link = document.createElement('a');
  const url = URL.createObjectURL(blob);
  
  link.setAttribute('href', url);
  link.setAttribute('download', filename);
  link.style.visibility = 'hidden';
  
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
};

/**
 * Convert chart data to Excel format (using basic HTML table approach)
 */
export const exportToExcel = (data: ChartDataPoint[], filename: string = 'voice-chart-data.xls') => {
  if (!data || data.length === 0) {
    console.error('No data to export');
    return;
  }

  // Create HTML table
  const tableHTML = `
    <html xmlns:o="urn:schemas-microsoft-com:office:office" xmlns:x="urn:schemas-microsoft-com:office:excel">
      <head>
        <meta charset="UTF-8">
        <!--[if gte mso 9]>
        <xml>
          <x:ExcelWorkbook>
            <x:ExcelWorksheets>
              <x:ExcelWorksheet>
                <x:Name>Voice Data</x:Name>
                <x:WorksheetOptions>
                  <x:DisplayGridlines/>
                </x:WorksheetOptions>
              </x:ExcelWorksheet>
            </x:ExcelWorksheets>
          </x:ExcelWorkbook>
        </xml>
        <![endif]-->
        <style>
          table { border-collapse: collapse; width: 100%; }
          th, td { border: 1px solid #ddd; padding: 8px; text-align: left; }
          th { background-color: #f2f2f2; font-weight: bold; }
        </style>
      </head>
      <body>
        <table>
          <thead>
            <tr>
              <th>Period</th>
              <th>Minutes</th>
              <th>Calls</th>
              <th>Avg Duration (min)</th>
              <th>Estimated Cost ($)</th>
            </tr>
          </thead>
          <tbody>
            ${data.map(point => `
              <tr>
                <td>${point.label}</td>
                <td>${point.minutes}</td>
                <td>${point.calls || 0}</td>
                <td>${point.avgDuration?.toFixed(2) || '0.00'}</td>
                <td>${point.estimatedCost?.toFixed(4) || '0.0000'}</td>
              </tr>
            `).join('')}
          </tbody>
        </table>
      </body>
    </html>
  `;

  // Create blob and download
  const blob = new Blob([tableHTML], { type: 'application/vnd.ms-excel' });
  const link = document.createElement('a');
  const url = URL.createObjectURL(blob);
  
  link.setAttribute('href', url);
  link.setAttribute('download', filename);
  link.style.visibility = 'hidden';
  
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
};

/**
 * Format date for export filename
 */
export const getExportFilename = (prefix: string, extension: string): string => {
  const now = new Date();
  const dateStr = now.toISOString().split('T')[0];
  return `${prefix}-${dateStr}.${extension}`;
};
