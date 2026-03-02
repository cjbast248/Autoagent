import React from 'react';

// Custom Image Icons using Supabase URLs
const ImageIcon: React.FC<{ src: string; className?: string; size?: number }> = ({ src, className, size = 24 }) => (
  <img 
    src={src} 
    alt="" 
    width={size} 
    height={size} 
    className={className}
    draggable={false}
    style={{ 
      borderRadius: '14px', 
      objectFit: 'cover',
      width: size,
      height: size,
      pointerEvents: 'none',
      userSelect: 'none',
    }}
  />
);

// Manual Trigger / Execute Workflow Icon
export const ManualTriggerIcon: React.FC<{ className?: string; size?: number }> = ({ className, size = 24 }) => (
  <ImageIcon 
    src="https://pwfczzxwjfxomqzhhwvj.supabase.co/storage/v1/object/public/Poze%20Agentauto/Frame%2061.png" 
    className={className} 
    size={size} 
  />
);

// Chat Trigger Icon
export const ChatTriggerIcon: React.FC<{ className?: string; size?: number }> = ({ className, size = 24 }) => (
  <ImageIcon 
    src="https://pwfczzxwjfxomqzhhwvj.supabase.co/storage/v1/object/public/Poze%20Agentauto/Frame%2066.png" 
    className={className} 
    size={size} 
  />
);

// Telegram Icon
export const TelegramIcon: React.FC<{ className?: string; size?: number }> = ({ className, size = 24 }) => (
  <ImageIcon 
    src="https://pwfczzxwjfxomqzhhwvj.supabase.co/storage/v1/object/public/Poze%20Agentauto/Frame%2064.png" 
    className={className} 
    size={size} 
  />
);

// Kalina Call Icon
export const KalinaIcon: React.FC<{ className?: string; size?: number }> = ({ className, size = 24 }) => (
  <ImageIcon 
    src="https://pwfczzxwjfxomqzhhwvj.supabase.co/storage/v1/object/public/Poze%20Agentauto/Frame%2063.png" 
    className={className} 
    size={size} 
  />
);

// Wait Icon
export const WaitIcon: React.FC<{ className?: string; size?: number }> = ({ className, size = 24 }) => (
  <ImageIcon 
    src="https://pwfczzxwjfxomqzhhwvj.supabase.co/storage/v1/object/public/Poze%20Agentauto/Frame%2062.png" 
    className={className} 
    size={size} 
  />
);

// Zoho CRM Icon
export const ZohoCRMIcon: React.FC<{ className?: string; size?: number }> = ({ className, size = 24 }) => (
  <ImageIcon 
    src="https://pwfczzxwjfxomqzhhwvj.supabase.co/storage/v1/object/public/Poze%20Agentauto/Frame%2065.png" 
    className={className} 
    size={size} 
  />
);

// Infobip Icon (Email & SMS)
export const InfobipIcon: React.FC<{ className?: string; size?: number }> = ({ className, size = 24 }) => (
  <ImageIcon 
    src="https://pwfczzxwjfxomqzhhwvj.supabase.co/storage/v1/object/public/Poze%20Agentauto/Frame%2067.png" 
    className={className} 
    size={size} 
  />
);

export const InfobipEmailIcon: React.FC<{ className?: string; size?: number }> = ({ className, size = 24 }) => (
  <ImageIcon 
    src="https://pwfczzxwjfxomqzhhwvj.supabase.co/storage/v1/object/public/Poze%20Agentauto/Frame%2067.png" 
    className={className} 
    size={size} 
  />
);

export const InfobipSMSIcon: React.FC<{ className?: string; size?: number }> = ({ className, size = 24 }) => (
  <ImageIcon 
    src="https://pwfczzxwjfxomqzhhwvj.supabase.co/storage/v1/object/public/Poze%20Agentauto/Frame%2067.png" 
    className={className} 
    size={size} 
  />
);

// Groq Analysis Icon
export const GroqIcon: React.FC<{ className?: string; size?: number }> = ({ className, size = 24 }) => (
  <ImageIcon 
    src="https://pwfczzxwjfxomqzhhwvj.supabase.co/storage/v1/object/public/Poze%20Agentauto/Frame%2068.png" 
    className={className} 
    size={size} 
  />
);

// RAG (Retrieval-Augmented Generation) Icon
export const RAGIcon: React.FC<{ className?: string; size?: number }> = ({ className, size = 24 }) => (
  <ImageIcon
    src="https://pwfczzxwjfxomqzhhwvj.supabase.co/storage/v1/object/public/Poze%20Agentauto/Frame%2069.png"
    className={className}
    size={size}
  />
);

// Basic LLM Chain Icon - Chain link icon (like n8n)
export const BasicLLMChainIcon: React.FC<{ className?: string; size?: number }> = ({ className, size = 24 }) => (
  <svg viewBox="0 0 100 100" width={size} height={size} className={className} fill="none">
    <rect width="100" height="100" rx="16" fill="#525252" />
    <g transform="translate(20, 25)">
      {/* Chain link icon */}
      <path
        d="M25 35a12.5 12.5 0 0 0 18.85 1.35l7.5-7.5a12.5 12.5 0 0 0-17.67-17.67l-4.3 4.28"
        stroke="#a3e635"
        strokeWidth="5"
        strokeLinecap="round"
        strokeLinejoin="round"
        fill="none"
      />
      <path
        d="M35 15a12.5 12.5 0 0 0-18.85-1.35l-7.5 7.5a12.5 12.5 0 0 0 17.67 17.67l4.28-4.28"
        stroke="#a3e635"
        strokeWidth="5"
        strokeLinecap="round"
        strokeLinejoin="round"
        fill="none"
      />
    </g>
  </svg>
);

// Groq Chat Model Icon - Groq icon with green model border indicator
// When used as a standalone node icon (size=100), we need to fit within the 100x100 node container
// which has 16px border-radius corners, so the circle should be smaller (around 70px) to not escape
export const GroqChatModelIcon: React.FC<{ className?: string; size?: number }> = ({ className, size = 24 }) => {
  // For large sizes (node icons), scale down the circle to fit inside the square container
  const isNodeSize = size >= 80;
  const circleSize = isNodeSize ? size * 0.7 : size;
  const imgSize = circleSize * 0.6;

  return (
    <div
      className={className}
      style={{
        width: size,
        height: size,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
      }}
    >
      <div
        style={{
          width: circleSize,
          height: circleSize,
          borderRadius: '50%',
          backgroundColor: '#1a1a1a',
          border: '3px solid #10b981',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          boxSizing: 'border-box',
        }}
      >
        <img
          src="https://pwfczzxwjfxomqzhhwvj.supabase.co/storage/v1/object/public/Poze%20Agentauto/Frame%2068.png"
          alt="Groq"
          style={{
            width: imgSize,
            height: imgSize,
            borderRadius: '50%',
            objectFit: 'cover',
          }}
          draggable={false}
        />
      </div>
    </div>
  );
};

// Google Sheets Icon - keeping SVG for now (no custom image provided)
export const GoogleSheetsIcon: React.FC<{ className?: string; size?: number }> = ({ className, size = 24 }) => (
  <svg viewBox="0 0 24 24" width={size} height={size} className={className} fill="none">
    <rect x="3" y="2" width="18" height="20" rx="2" fill="#34A853" />
    <rect x="6" y="6" width="12" height="3" fill="white" opacity="0.9" />
    <rect x="6" y="10.5" width="12" height="3" fill="white" opacity="0.7" />
    <rect x="6" y="15" width="12" height="3" fill="white" opacity="0.5" />
  </svg>
);

// HTTP Request Icon - using official n8n image
export const HTTPIcon: React.FC<{ className?: string; size?: number }> = ({ className, size = 24 }) => (
  <img 
    src="https://pwfczzxwjfxomqzhhwvj.supabase.co/storage/v1/object/public/Poze%20Agentauto/0_s9i-MVI2A3X4cPzZ.png" 
    alt="HTTP Request" 
    width={size} 
    height={size} 
    className={className}
    style={{ borderRadius: '4px', objectFit: 'cover' }}
  />
);

// Webhook Icon - using official n8n image
export const WebhookIcon: React.FC<{ className?: string; size?: number }> = ({ className, size = 24 }) => (
  <img 
    src="https://pwfczzxwjfxomqzhhwvj.supabase.co/storage/v1/object/public/Poze%20Agentauto/color-webhook-240-1deccb0e365ff4ea493396ad28638fb7.png" 
    alt="Webhook" 
    width={size} 
    height={size} 
    className={className}
    style={{ borderRadius: '4px' }}
  />
);

// Respond to Webhook Icon
export const RespondToWebhookIcon: React.FC<{ className?: string; size?: number }> = ({ className, size = 24 }) => (
  <svg viewBox="0 0 24 24" width={size} height={size} className={className} fill="none">
    <defs>
      <linearGradient id="respondGradient" x1="0%" y1="0%" x2="100%" y2="100%">
        <stop offset="0%" stopColor="#A855F7" />
        <stop offset="100%" stopColor="#EC4899" />
      </linearGradient>
    </defs>
    <rect x="2" y="2" width="20" height="20" rx="4" fill="url(#respondGradient)" />
    <path d="M16 12L12 8M16 12L12 16M16 12H8" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
  </svg>
);

// Code Icon - keeping SVG
export const CodeIcon: React.FC<{ className?: string; size?: number }> = ({ className, size = 24 }) => (
  <svg viewBox="0 0 24 24" width={size} height={size} className={className} fill="none">
    <rect x="2" y="2" width="20" height="20" rx="4" fill="#F59E0B" />
    <path d="M9 7C7.5 7 7 8 7 9V11C7 12 6 12 6 12C6 12 7 12 7 13V15C7 16 7.5 17 9 17" stroke="white" strokeWidth="2" strokeLinecap="round" />
    <path d="M15 7C16.5 7 17 8 17 9V11C17 12 18 12 18 12C18 12 17 12 17 13V15C17 16 16.5 17 15 17" stroke="white" strokeWidth="2" strokeLinecap="round" />
  </svg>
);

// Schedule Trigger Icon - keeping SVG
export const ScheduleIcon: React.FC<{ className?: string; size?: number }> = ({ className, size = 24 }) => (
  <svg viewBox="0 0 24 24" width={size} height={size} className={className} fill="none">
    <circle cx="12" cy="12" r="10" fill="#0EA5E9" />
    <circle cx="12" cy="12" r="7" stroke="white" strokeWidth="1.5" fill="none" />
    <path d="M12 7V12L15 14" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
  </svg>
);

// Call History Icon - keeping SVG
export const CallHistoryIcon: React.FC<{ className?: string; size?: number }> = ({ className, size = 24 }) => (
  <svg viewBox="0 0 24 24" width={size} height={size} className={className} fill="none">
    <rect x="2" y="2" width="20" height="20" rx="4" fill="#22C55E" />
    <path d="M6 8H18" stroke="white" strokeWidth="2" strokeLinecap="round" />
    <path d="M6 12H14" stroke="white" strokeWidth="2" strokeLinecap="round" />
    <path d="M6 16H10" stroke="white" strokeWidth="2" strokeLinecap="round" />
  </svg>
);

// Phone Icon - keeping SVG
export const PhoneIcon: React.FC<{ className?: string; size?: number }> = ({ className, size = 24 }) => (
  <svg viewBox="0 0 24 24" width={size} height={size} className={className} fill="none">
    <circle cx="12" cy="12" r="10" fill="#10B981" />
    <path
      d="M8.5 7.5C8.5 7.5 9 7 10 7C11 7 11.5 7.5 11.5 8.5V9.5C11.5 10.5 11 11 10 11.5L9 12L12 15L13 14C13.5 13.5 14 13 15 13H16C17 13 17.5 13.5 17.5 14.5C17.5 15.5 17 16 16.5 16.5C15.5 17.5 13 18 11 16C9 14 8 12 7 10C6 8 6.5 6 7.5 5.5C8 5 8.5 4.5 9.5 4.5"
      stroke="white"
      strokeWidth="1.5"
      strokeLinecap="round"
    />
  </svg>
);

// Altegio Icon (using official logo image)
export const AltegioIcon: React.FC<{ className?: string; size?: number }> = ({ className, size = 24 }) => (
  <img 
    src="https://pwfczzxwjfxomqzhhwvj.supabase.co/storage/v1/object/public/Poze%20Agentauto/unnamed.png" 
    alt="Altegio" 
    width={size} 
    height={size} 
    className={className}
    style={{ borderRadius: '4px' }}
  />
);

// Odoo Icon (rounded badge with O letter)
export const OdooIcon: React.FC<{ className?: string; size?: number }> = ({ className, size = 24 }) => (
  <svg viewBox="0 0 24 24" width={size} height={size} className={className} fill="none">
    <defs>
      <linearGradient id="odoo-grad" x1="4" y1="4" x2="20" y2="20" gradientUnits="userSpaceOnUse">
        <stop stopColor="#8A2BE2" />
        <stop offset="1" stopColor="#5B2C83" />
      </linearGradient>
    </defs>
    <rect x="2" y="2" width="20" height="20" rx="6" fill="url(#odoo-grad)" />
    <circle cx="12" cy="12" r="5.5" stroke="#F4F4F5" strokeWidth="2" fill="none" />
    <circle cx="12" cy="12" r="2" fill="#F4F4F5" />
  </svg>
);

// amoCRM Icon (blue gradient)
export const AmoCRMIcon: React.FC<{ className?: string; size?: number }> = ({ className, size = 24 }) => (
  <svg viewBox="0 0 24 24" width={size} height={size} className={className} fill="none">
    <defs>
      <linearGradient id="amocrm-grad" x1="4" y1="4" x2="20" y2="20" gradientUnits="userSpaceOnUse">
        <stop stopColor="#5BC0F8" />
        <stop offset="1" stopColor="#2A86FF" />
      </linearGradient>
    </defs>
    <rect x="2" y="2" width="20" height="20" rx="6" fill="url(#amocrm-grad)" />
    <path
      d="M7 13c1 2 2.5 3 4.5 3s3.5-1 4.5-3M8 10.5c0-1.7 1.3-3 2.9-3 1.2 0 2.2.7 2.6 1.8.4-1.1 1.4-1.8 2.6-1.8 1.6 0 2.9 1.3 2.9 3"
      stroke="#F8FBFF"
      strokeWidth="1.7"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
  </svg>
);

// Bitrix24 Icon (cyan/blue gradient)
export const Bitrix24Icon: React.FC<{ className?: string; size?: number }> = ({ className, size = 24 }) => (
  <svg viewBox="0 0 24 24" width={size} height={size} className={className} fill="none">
    <defs>
      <linearGradient id="bitrix24-grad" x1="4" y1="4" x2="20" y2="20" gradientUnits="userSpaceOnUse">
        <stop stopColor="#2FC6F6" />
        <stop offset="1" stopColor="#0891B2" />
      </linearGradient>
    </defs>
    <rect x="2" y="2" width="20" height="20" rx="6" fill="url(#bitrix24-grad)" />
    <rect x="5" y="6" width="14" height="2.5" rx="1" fill="#F8FBFF" />
    <rect x="5" y="10.5" width="14" height="2.5" rx="1" fill="#F8FBFF" opacity="0.8" />
    <rect x="5" y="15" width="14" height="2.5" rx="1" fill="#F8FBFF" opacity="0.6" />
  </svg>
);

// 999.md Scraper Icon (using custom image)
export const Scraper999Icon: React.FC<{ className?: string; size?: number }> = ({ className, size = 24 }) => (
  <ImageIcon
    src="https://pwfczzxwjfxomqzhhwvj.supabase.co/storage/v1/object/public/Poze%20Agentauto/Frame%2071.png"
    className={className}
    size={size}
  />
);

// Split Out Icon - pentru a separa array-uri în items individuale
export const SplitOutIcon: React.FC<{ className?: string; size?: number }> = ({ className, size = 24 }) => (
  <svg className={className} width={size} height={size} viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
    <path d="M4 12H8M8 12L8 6M8 12L8 18" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
    <path d="M8 6L14 6M8 12H14M8 18L14 18" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
    <path d="M14 6L20 6M14 6L14 3" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
    <path d="M14 12L20 12" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
    <path d="M14 18L20 18M14 18L14 21" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
    <circle cx="20" cy="6" r="2" fill="currentColor"/>
    <circle cx="20" cy="12" r="2" fill="currentColor"/>
    <circle cx="20" cy="18" r="2" fill="currentColor"/>
  </svg>
);

// Galltrans Routes Icon - bus/transport icon with route
export const GalltransRoutesIcon: React.FC<{ className?: string; size?: number }> = ({ className, size = 24 }) => (
  <svg className={className} width={size} height={size} viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
    <defs>
      <linearGradient id="galltrans-grad" x1="4" y1="4" x2="20" y2="20" gradientUnits="userSpaceOnUse">
        <stop stopColor="#2563eb" />
        <stop offset="1" stopColor="#1e40af" />
      </linearGradient>
    </defs>
    <rect x="2" y="2" width="20" height="20" rx="6" fill="url(#galltrans-grad)" />
    {/* Bus icon */}
    <rect x="5" y="7" width="14" height="9" rx="2" fill="#F4F4F5" />
    <rect x="6" y="8" width="4" height="3" rx="0.5" fill="#2563eb" />
    <rect x="11" y="8" width="4" height="3" rx="0.5" fill="#2563eb" />
    <circle cx="8" cy="16" r="1.5" fill="#1e40af" />
    <circle cx="16" cy="16" r="1.5" fill="#1e40af" />
    <line x1="5" y1="13" x2="19" y2="13" stroke="#2563eb" strokeWidth="0.5" />
  </svg>
);

// City Lookup Icon - map pin with search
export const CityLookupIcon: React.FC<{ className?: string; size?: number }> = ({ className, size = 24 }) => (
  <svg className={className} width={size} height={size} viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
    <defs>
      <linearGradient id="citylookup-grad" x1="4" y1="4" x2="20" y2="20" gradientUnits="userSpaceOnUse">
        <stop stopColor="#10b981" />
        <stop offset="1" stopColor="#059669" />
      </linearGradient>
    </defs>
    <rect x="2" y="2" width="20" height="20" rx="6" fill="url(#citylookup-grad)" />
    {/* Map pin */}
    <path d="M12 5C9.24 5 7 7.24 7 10C7 13.5 12 18 12 18C12 18 17 13.5 17 10C17 7.24 14.76 5 12 5Z" fill="#F4F4F5" stroke="#059669" strokeWidth="0.5" />
    <circle cx="12" cy="10" r="2" fill="#059669" />
  </svg>
);

// Loop Icon - pentru iterații
export const LoopIcon: React.FC<{ className?: string; size?: number }> = ({ className, size = 24 }) => (
  <svg className={className} width={size} height={size} viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
    <path d="M17 2L21 6L17 10" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
    <path d="M3 11V9C3 7.93913 3.42143 6.92172 4.17157 6.17157C4.92172 5.42143 5.93913 5 7 5H21" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
    <path d="M7 22L3 18L7 14" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
    <path d="M21 13V15C21 16.0609 20.5786 17.0783 19.8284 17.8284C19.0783 18.5786 18.0609 19 17 19H3" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
  </svg>
);

// Edit Fields icon - pencil with lines
export const EditFieldsIcon: React.FC<{ className?: string; size?: number }> = ({ className, size = 24 }) => (
  <svg className={className} width={size} height={size} viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
    <path d="M11 4H4C3.46957 4 2.96086 4.21071 2.58579 4.58579C2.21071 4.96086 2 5.46957 2 6V20C2 20.5304 2.21071 21.0391 2.58579 21.4142C2.96086 21.7893 3.46957 22 4 22H18C18.5304 22 19.0391 21.7893 19.4142 21.4142C19.7893 21.0391 20 20.5304 20 20V13" stroke="#a855f7" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
    <path d="M18.5 2.50001C18.8978 2.10219 19.4374 1.87869 20 1.87869C20.5626 1.87869 21.1022 2.10219 21.5 2.50001C21.8978 2.89784 22.1213 3.4374 22.1213 4.00001C22.1213 4.56262 21.8978 5.10219 21.5 5.50001L12 15L8 16L9 12L18.5 2.50001Z" stroke="#a855f7" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
  </svg>
);

// If/Branch icon - diamond with question
export const IfIcon: React.FC<{ className?: string; size?: number }> = ({ className, size = 24 }) => (
  <svg className={className} width={size} height={size} viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
    <path d="M12 2L22 12L12 22L2 12L12 2Z" stroke="#f97316" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
    <path d="M12 8V12" stroke="#f97316" strokeWidth="2" strokeLinecap="round"/>
    <circle cx="12" cy="16" r="1" fill="#f97316"/>
  </svg>
);

// No Operation icon - empty circle
export const NoOpIcon: React.FC<{ className?: string; size?: number }> = ({ className, size = 24 }) => (
  <svg className={className} width={size} height={size} viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
    <circle cx="12" cy="12" r="9" stroke="#6b7280" strokeWidth="2" strokeDasharray="4 2"/>
  </svg>
);

// Map of node types to their brand icons
export const brandIconMap: Record<string, React.FC<{ className?: string; size?: number }>> = {
  'telegram': TelegramIcon,
  'zoho-crm': ZohoCRMIcon,
  'zoho_crm': ZohoCRMIcon,
  'google-sheets': GoogleSheetsIcon,
  'google_sheets': GoogleSheetsIcon,
  'groq-analysis': GroqIcon,
  'groq_analysis': GroqIcon,
  'rag': RAGIcon,
  'rag-search': RAGIcon,
  'rag_search': RAGIcon,
  'kalina-call': KalinaIcon,
  'kalina_call': KalinaIcon,
  'http-request': HTTPIcon,
  'http_request': HTTPIcon,
  'webhook-trigger': WebhookIcon,
  'webhook_trigger': WebhookIcon,
  'respond-to-webhook': RespondToWebhookIcon,
  'respond_to_webhook': RespondToWebhookIcon,
  'code': CodeIcon,
  'manual-trigger': ManualTriggerIcon,
  'manual_trigger': ManualTriggerIcon,
  'schedule-trigger': ScheduleIcon,
  'schedule_trigger': ScheduleIcon,
  'wait-call': WaitIcon,
  'wait_call': WaitIcon,
  'call-history': CallHistoryIcon,
  'call_history': CallHistoryIcon,
  'phone': PhoneIcon,
  'infobip': InfobipIcon,
  'infobip-email': InfobipEmailIcon,
  'infobip_email': InfobipEmailIcon,
  'infobip-send-email': InfobipEmailIcon,
  'infobip_send_email': InfobipEmailIcon,
  'infobip-sms': InfobipSMSIcon,
  'infobip_sms': InfobipSMSIcon,
  'infobip-send-sms': InfobipSMSIcon,
  'infobip_send_sms': InfobipSMSIcon,
  'chat-trigger': ChatTriggerIcon,
  'chat_trigger': ChatTriggerIcon,
  // Altegio
  'altegio': AltegioIcon,
  'altegio-list-bookings': AltegioIcon,
  'altegio-create-booking': AltegioIcon,
  'altegio-update-booking': AltegioIcon,
  'altegio-cancel-booking': AltegioIcon,
  'altegio-list-services': AltegioIcon,
  'altegio-list-branches': AltegioIcon,
  'altegio-webhook': AltegioIcon,
  // Odoo
  'odoo': OdooIcon,
  'odoo-crm': OdooIcon,
  'odoo-search': OdooIcon,
  'odoo-search-read': OdooIcon,
  'odoo-create': OdooIcon,
  'odoo-update': OdooIcon,
  'odoo-delete': OdooIcon,
  'odoo-fields-get': OdooIcon,
  'odoo-execute': OdooIcon,
  // amoCRM
  'amocrm': AmoCRMIcon,
  'amocrm-connect': AmoCRMIcon,
  // Bitrix24
  'bitrix24': Bitrix24Icon,
  'bitrix': Bitrix24Icon,
  'bitrix24-crm': Bitrix24Icon,
  'bitrix24-trigger': Bitrix24Icon,
  // 999.md Scraper
  '999-scraper': Scraper999Icon,
  '999_scraper': Scraper999Icon,
  '999md': Scraper999Icon,
  '999.md': Scraper999Icon,
  'scraper-999': Scraper999Icon,
  // Flow control
  'split-out': SplitOutIcon,
  'split_out': SplitOutIcon,
  'loop': LoopIcon,
  'loop-over-items': LoopIcon,
  // AI Chain nodes
  'basic-llm-chain': BasicLLMChainIcon,
  'basic_llm_chain': BasicLLMChainIcon,
  'groq-chat-model': GroqChatModelIcon,
  'groq_chat_model': GroqChatModelIcon,
  // Transport & Location nodes
  'galltrans-routes': GalltransRoutesIcon,
  'galltrans': GalltransRoutesIcon,
  'route-search': GalltransRoutesIcon,
  'city-lookup': CityLookupIcon,
  'citylookup': CityLookupIcon,
  'location-lookup': CityLookupIcon,
};

// Get brand icon by type or label
export const getBrandIcon = (typeOrLabel: string): React.FC<{ className?: string; size?: number }> | null => {
  const normalized = typeOrLabel.toLowerCase().replace(/\s+/g, '-');
  
  // Direct match
  if (brandIconMap[normalized]) {
    return brandIconMap[normalized];
  }
  
  // Check if label contains keywords
  const labelLower = typeOrLabel.toLowerCase();
  
  if (labelLower.includes('chat') && labelLower.includes('trigger')) return ChatTriggerIcon;
  if (labelLower.includes('telegram')) return TelegramIcon;
  if (labelLower.includes('zoho')) return ZohoCRMIcon;
  if (labelLower.includes('google') && labelLower.includes('sheet')) return GoogleSheetsIcon;
  if (labelLower.includes('basic') && labelLower.includes('llm') && labelLower.includes('chain')) return BasicLLMChainIcon;
  if (labelLower.includes('groq') && labelLower.includes('chat') && labelLower.includes('model')) return GroqChatModelIcon;
  if (labelLower.includes('groq') || labelLower.includes('analysis')) return GroqIcon;
  if (labelLower.includes('rag') || labelLower.includes('retrieval')) return RAGIcon;
  if (labelLower.includes('kalina') && labelLower.includes('call')) return KalinaIcon;
  if (labelLower.includes('http') || labelLower.includes('request')) return HTTPIcon;
  if (labelLower.includes('webhook')) return WebhookIcon;
  if (labelLower.includes('code')) return CodeIcon;
  if (labelLower.includes('manual') || labelLower.includes('execute workflow') || labelLower.includes('when clicking')) return ManualTriggerIcon;
  if (labelLower.includes('schedule') || labelLower.includes('cron')) return ScheduleIcon;
  if (labelLower.includes('wait')) return WaitIcon;
  if (labelLower.includes('call history') || labelLower.includes('istoric')) return CallHistoryIcon;
  if (labelLower.includes('phone') || labelLower.includes('telefon')) return PhoneIcon;
  // Infobip icons
  if (labelLower.includes('infobip') && labelLower.includes('email')) return InfobipEmailIcon;
  if (labelLower.includes('infobip') && labelLower.includes('sms')) return InfobipSMSIcon;
  if (labelLower.includes('infobip')) return InfobipIcon;
  // Altegio
  if (labelLower.includes('altegio')) return AltegioIcon;
  // Odoo
  if (labelLower.includes('odoo')) return OdooIcon;
  // amoCRM
  if (labelLower.includes('amocrm') || labelLower.includes('amo crm')) return AmoCRMIcon;
  // Bitrix24
  if (labelLower.includes('bitrix') || labelLower.includes('bitrix24')) return Bitrix24Icon;
  // 999.md Scraper
  if (labelLower.includes('999') || labelLower.includes('scraper') || labelLower.includes('imobiliare')) return Scraper999Icon;
  // Galltrans Routes
  if (labelLower.includes('galltrans') || (labelLower.includes('route') && !labelLower.includes('webhook'))) return GalltransRoutesIcon;
  // City Lookup
  if (labelLower.includes('city') && labelLower.includes('lookup')) return CityLookupIcon;
  if (labelLower.includes('location') && labelLower.includes('lookup')) return CityLookupIcon;

  return null;
};
