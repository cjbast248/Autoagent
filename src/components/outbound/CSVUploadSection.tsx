
import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Upload, Download } from 'lucide-react';

interface CSVUploadSectionProps {
  onFileSelect: () => void;
  onDownloadTemplate: () => void;
}

export const CSVUploadSection: React.FC<CSVUploadSectionProps> = ({
  onFileSelect,
  onDownloadTemplate,
}) => {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Upload className="w-5 h-5" />
          Încărcare Contacte CSV
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex items-center justify-between">
          <Button
            onClick={onFileSelect}
            variant="outline"
            className="bg-white text-gray-900 border-gray-300"
          >
            <Upload className="w-4 h-4 mr-2" />
            Selectează CSV
          </Button>
          <Button
            onClick={onDownloadTemplate}
            variant="ghost"
            className="text-blue-600 hover:text-blue-800"
          >
            <Download className="w-4 h-4 mr-2" />
            Descarcă Template
          </Button>
        </div>
        <p className="text-sm text-gray-600">
          CSV-ul trebuie să conțină coloanele: nume, telefon, language, locatie
        </p>
      </CardContent>
    </Card>
  );
};
