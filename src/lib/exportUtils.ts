import * as XLSX from 'xlsx';

/**
 * Utility to export data to an Excel file (.xlsx)
 * @param data Array of objects representing the rows
 * @param filename Name of the file (without extension)
 * @param sheetName Name of the sheet in the workbook
 * @param colWidths Optional array of column widths (e.g. [{ wch: 10 }, { wch: 15 }])
 */
export const exportToExcel = (data: any[], filename: string, sheetName: string = 'Data', colWidths?: XLSX.ColInfo[]) => {
    const worksheet = XLSX.utils.json_to_sheet(data);
    
    if (colWidths) {
        worksheet['!cols'] = colWidths;
    } else {
        // Default column width of 15 for better readability
        const maxCols = data.length > 0 ? Object.keys(data[0]).length : 10;
        worksheet['!cols'] = Array(maxCols).fill({ wch: 15 });
    }

    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, sheetName);
    XLSX.writeFile(workbook, `${filename}.xlsx`);
};

/**
 * Utility to export data to a CSV file with BOM for Arabic support
 * @param headers Array of strings for the first row
 * @param rows Array of arrays for the data rows
 * @param filename Name of the file (without extension)
 * @param separator Separator char (default is semicolon for better Excel compatibility in Arabic locales)
 */
export const exportToCSV = (headers: string[], rows: any[][], filename: string, separator: string = ';') => {
    const BOM = '\uFEFF';
    let csvContent = headers.join(separator) + '\n';
    
    rows.forEach(row => {
        csvContent += row.join(separator) + '\n';
    });
    
    const blob = new Blob([BOM + csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.setAttribute("href", url);
    link.setAttribute("download", `${filename}.csv`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
};
