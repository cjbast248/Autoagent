
import { CreateTextDocumentRequest, CreateDocumentResponse, KnowledgeBaseResponse } from '../types/dtos';
import { supabase } from '../integrations/supabase/client';
import { ENV } from '../config/environment';

export class KnowledgeBaseController {
  static async createTextDocument(request: CreateTextDocumentRequest): Promise<CreateDocumentResponse> {
    console.log('Creating text document:', request);
    
    try {
      const { data, error } = await supabase.functions.invoke('knowledge-base-operations', {
        body: request,
      });
      
      console.log('Supabase function response:', { data, error });
      
      if (error) {
        console.error('Create text document error:', error);
        throw new Error(`Create text document failed: ${error.message}`);
      }
      
      return data;
    } catch (err) {
      console.error('Network error creating text document:', err);
      throw err;
    }
  }

  static async uploadFileDocument(name: string, file: File): Promise<CreateDocumentResponse> {
    console.log('Uploading file document:', { name, fileSize: file.size, fileType: file.type });
    
    try {
      const formData = new FormData();
      formData.append('file', file);
      formData.append('name', name);
      
      const { data, error } = await supabase.functions.invoke('knowledge-base-operations', {
        body: formData,
      });
      
      console.log('Supabase function response:', { data, error });
      
      if (error) {
        console.error('File upload error:', error);
        throw new Error(`File upload failed: ${error.message}`);
      }
      
      return data;
    } catch (err) {
      console.error('Network error uploading file:', err);
      throw err;
    }
  }

  static async createUrlDocument(name: string, url: string): Promise<CreateDocumentResponse> {
    console.log('Creating URL document:', { name, url });
    
    try {
      const { data, error } = await supabase.functions.invoke('knowledge-base-operations', {
        body: {
          name: name,
          url: url
        },
      });
      
      console.log('Supabase function response:', { data, error });
      
      if (error) {
        console.error('Create URL document error:', error);
        throw new Error(`Create URL document failed: ${error.message}`);
      }
      
      return data;
    } catch (err) {
      console.error('Network error creating URL document:', err);
      throw err;
    }
  }

  static async getExistingDocuments(): Promise<KnowledgeBaseResponse> {
    const { data, error } = await supabase.functions.invoke('knowledge-base-operations', {
      method: 'GET',
    });
    
    if (error) {
      console.error('Get existing documents error:', error);
      throw new Error(`Get existing documents failed: ${error.message}`);
    }
    
    return data;
  }
}
