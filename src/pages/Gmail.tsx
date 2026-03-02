import React from 'react';
import { useAuth } from '@/components/AuthContext';
import { Navigate } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Mail, Upload, Send, Database, Clock, Sparkles } from 'lucide-react';
import DashboardLayout from '@/components/DashboardLayout';
const Gmail = () => {
  const {
    user
  } = useAuth();
  if (!user) {
    return <Navigate to="/auth" replace />;
  }
  return <DashboardLayout>
      <div className="min-h-screen bg-white">
        <div className="max-w-6xl mx-auto px-6 py-8">
          {/* Header */}
          <div className="mb-8">
            <div className="flex items-center justify-between">
              <div>
                <h1 className="text-2xl font-semibold text-gray-900 mb-1 flex items-center">
                  <Mail className="w-6 h-6 mr-3 text-blue-600" />
                  Gmail Marketing
                </h1>
                <p className="text-gray-600 text-sm">Campanii de marketing prin email pentru companii</p>
              </div>
              <Badge variant="secondary" className="bg-orange-100 text-orange-800 border-orange-200">
                <Clock className="w-3 h-3 mr-1" />
                În curând
              </Badge>
            </div>
          </div>

          {/* Coming Soon Banner */}
          

          {/* Preview of Features */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-8">
            {/* Database Upload */}
            <Card className="opacity-75">
              <CardHeader className="pb-3">
                <CardTitle className="text-lg flex items-center">
                  <Database className="w-5 h-5 mr-2 text-green-600" />
                  Încărcare Bază de Date
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  <div>
                    <Label className="text-sm text-gray-600">Fișier CSV cu companii</Label>
                    <div className="mt-1 p-3 border-2 border-dashed border-gray-300 rounded-lg bg-gray-50">
                      <Upload className="w-8 h-8 text-gray-400 mx-auto mb-2" />
                      <p className="text-sm text-gray-500 text-center">Drag & drop CSV</p>
                    </div>
                  </div>
                  <p className="text-xs text-gray-500">
                    Coloane: Email, Nume Companie, Descriere, Industrie
                  </p>
                </div>
              </CardContent>
            </Card>

            {/* Email Template */}
            <Card className="opacity-75">
              <CardHeader className="pb-3">
                <CardTitle className="text-lg flex items-center">
                  <Mail className="w-5 h-5 mr-2 text-blue-600" />
                  Template Email
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  <div>
                    <Label className="text-sm text-gray-600">Subiect</Label>
                    <Input placeholder="Propunere de colaborare pentru {company_name}" className="mt-1 bg-gray-50" disabled />
                  </div>
                  <div>
                    <Label className="text-sm text-gray-600">Conținut</Label>
                    <Textarea placeholder="Bună ziua,&#10;&#10;Sunt interesat de o colaborare cu {company_name} în domeniul {industry}..." className="mt-1 bg-gray-50 h-24" disabled />
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Campaign Settings */}
            <Card className="opacity-75">
              <CardHeader className="pb-3">
                <CardTitle className="text-lg flex items-center">
                  <Send className="w-5 h-5 mr-2 text-purple-600" />
                  Setări Campanie
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  <div>
                    <Label className="text-sm text-gray-600">Email-uri per oră</Label>
                    <Input type="number" placeholder="50" className="mt-1 bg-gray-50" disabled />
                  </div>
                  <div>
                    <Label className="text-sm text-gray-600">Interval între email-uri</Label>
                    <Input placeholder="1-3 minute" className="mt-1 bg-gray-50" disabled />
                  </div>
                  <Button className="w-full" disabled>
                    <Send className="w-4 h-4 mr-2" />
                    Pornește Campania
                  </Button>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Features List */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Funcționalități Planificate</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-3">
                  <div className="flex items-start space-x-3">
                    <div className="w-2 h-2 bg-blue-500 rounded-full mt-2"></div>
                    <div>
                      <p className="font-medium text-gray-900">Import CSV/Excel</p>
                      <p className="text-sm text-gray-600">Încărcare baze de date cu companii și detalii</p>
                    </div>
                  </div>
                  <div className="flex items-start space-x-3">
                    <div className="w-2 h-2 bg-blue-500 rounded-full mt-2"></div>
                    <div>
                      <p className="font-medium text-gray-900">Template-uri personalizabile</p>
                      <p className="text-sm text-gray-600">Variabile dinamice pentru personalizare</p>
                    </div>
                  </div>
                  <div className="flex items-start space-x-3">
                    <div className="w-2 h-2 bg-blue-500 rounded-full mt-2"></div>
                    <div>
                      <p className="font-medium text-gray-900">Programare campanii</p>
                      <p className="text-sm text-gray-600">Control asupra timpului și ritmului de trimitere</p>
                    </div>
                  </div>
                </div>
                <div className="space-y-3">
                  <div className="flex items-start space-x-3">
                    <div className="w-2 h-2 bg-blue-500 rounded-full mt-2"></div>
                    <div>
                      <p className="font-medium text-gray-900">Tracking răspunsuri</p>
                      <p className="text-sm text-gray-600">Monitorizare rate de deschidere și răspuns</p>
                    </div>
                  </div>
                  <div className="flex items-start space-x-3">
                    <div className="w-2 h-2 bg-blue-500 rounded-full mt-2"></div>
                    <div>
                      <p className="font-medium text-gray-900">Integrare Gmail API</p>
                      <p className="text-sm text-gray-600">Trimitere directă prin contul tău Gmail</p>
                    </div>
                  </div>
                  <div className="flex items-start space-x-3">
                    <div className="w-2 h-2 bg-blue-500 rounded-full mt-2"></div>
                    <div>
                      <p className="font-medium text-gray-900">Rapoarte analitice</p>
                      <p className="text-sm text-gray-600">Statistici detaliate despre campanii</p>
                    </div>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Notification */}
          
        </div>
      </div>
    </DashboardLayout>;
};
export default Gmail;