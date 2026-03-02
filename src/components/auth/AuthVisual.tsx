import React, { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';

export const AuthVisual = () => {
  const [mediaUrl, setMediaUrl] = useState<string | null>(null);
  const [mediaType, setMediaType] = useState<'image' | 'video'>('image');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadMedia = async () => {
      try {
        // Try to load PNG first from Supabase Storage
        let { data } = supabase.storage
          .from('site-assets')
          .getPublicUrl('branding/auth-visual.png');
        
        let url = data?.publicUrl;
        let type: 'image' | 'video' = 'image';

        // Check if PNG exists by trying to fetch it
        if (url) {
          const response = await fetch(url, { method: 'HEAD' });
          if (!response.ok) {
            // PNG doesn't exist in Storage, try MP4
            const videoData = supabase.storage
              .from('site-assets')
              .getPublicUrl('branding/auth-visual.mp4');
            
            if (videoData?.data?.publicUrl) {
              const videoResponse = await fetch(videoData.data.publicUrl, { method: 'HEAD' });
              if (videoResponse.ok) {
                url = videoData.data.publicUrl;
                type = 'video';
              } else {
                // Fallback to local image
                url = '/lovable-uploads/agentauto-auth-visual.png';
                type = 'image';
              }
            } else {
              // Fallback to local image
              url = '/lovable-uploads/agentauto-auth-visual.png';
              type = 'image';
            }
          }
        } else {
          // Fallback to local image
          url = '/lovable-uploads/agentauto-auth-visual.png';
          type = 'image';
        }

        setMediaUrl(url);
        setMediaType(type);
      } catch (error) {
        console.error('Error loading auth visual:', error);
        // Fallback to local image on any error
        setMediaUrl('/lovable-uploads/agentauto-auth-visual.png');
        setMediaType('image');
      } finally {
        setLoading(false);
      }
    };

    loadMedia();
  }, []);

  if (loading) {
    return (
      <div className="auth-visual-media">
        <div className="auth-visual-overlay">
          <h1>AGENTAUTO</h1>
          <p>AI Voice Platform</p>
        </div>
      </div>
    );
  }

  return (
    <div className="auth-visual-media">
      {mediaUrl && (
        <>
          {mediaType === 'video' ? (
            <video 
              autoPlay 
              loop 
              muted 
              playsInline 
              src={mediaUrl}
              className="auth-visual-video"
            />
          ) : (
            <img 
              src={mediaUrl} 
              alt="Agent Automation" 
              className="auth-visual-image"
            />
          )}
        </>
      )}
      <div className="auth-visual-overlay">
        <h1>AGENTAUTO</h1>
        <p>AI Voice Platform</p>
      </div>
    </div>
  );
};
