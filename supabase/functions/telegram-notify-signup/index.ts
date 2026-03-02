// @ts-nocheck

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "GET,POST,PUT,DELETE,OPTIONS",
};

// Escape ALL Markdown special characters for MarkdownV2
const escapeMarkdown = (text: string | null | undefined): string => {
  if (!text) return '';
  return String(text).replace(/([_*\[\]()~`>#+=|{}.!\-\\])/g, '\\$1');
};

// Generate PDF content as base64
const generatePdfContent = (data: {
  firstName: string;
  lastName: string;
  email: string;
  userId: string;
  phone: string;
  language: string;
  howHeard: string;
  budget: string;
  employees: string;
  industry: string;
  date: string;
}): string => {
  // Create a simple PDF-like text document
  const content = `
%PDF-1.4
1 0 obj
<< /Type /Catalog /Pages 2 0 R >>
endobj
2 0 obj
<< /Type /Pages /Kids [3 0 R] /Count 1 >>
endobj
3 0 obj
<< /Type /Page /Parent 2 0 R /MediaBox [0 0 612 792] /Contents 4 0 R /Resources << /Font << /F1 5 0 R >> >> >>
endobj
4 0 obj
<< /Length 1500 >>
stream
BT
/F1 24 Tf
50 750 Td
(AGENTAUTO AI - Client Information) Tj
/F1 12 Tf
0 -40 Td
(=====================================) Tj
0 -30 Td
(PERSONAL INFORMATION) Tj
0 -20 Td
(-------------------------------------) Tj
0 -15 Td
(Name: ${data.firstName} ${data.lastName}) Tj
0 -15 Td
(Email: ${data.email}) Tj
0 -15 Td
(Phone: ${data.phone || 'Not provided'}) Tj
0 -15 Td
(Preferred Language: ${data.language || 'Not specified'}) Tj
0 -15 Td
(User ID: ${data.userId}) Tj
0 -30 Td
(BUSINESS INFORMATION) Tj
0 -20 Td
(-------------------------------------) Tj
0 -15 Td
(Monthly Budget: ${data.budget || 'Not specified'}) Tj
0 -15 Td
(Employees: ${data.employees || 'Not specified'}) Tj
0 -15 Td
(Industry: ${data.industry || 'Not specified'}) Tj
0 -15 Td
(How they heard about us: ${data.howHeard || 'Not specified'}) Tj
0 -30 Td
(-------------------------------------) Tj
0 -15 Td
(Registration Date: ${data.date}) Tj
0 -30 Td
(=====================================) Tj
0 -15 Td
(This document contains confidential information.) Tj
ET
endstream
endobj
5 0 obj
<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>
endobj
xref
0 6
0000000000 65535 f 
0000000009 00000 n 
0000000058 00000 n 
0000000115 00000 n 
0000000266 00000 n 
0000001820 00000 n 
trailer
<< /Size 6 /Root 1 0 R >>
startxref
1897
%%EOF`;

  // Convert to base64
  const encoder = new TextEncoder();
  const bytes = encoder.encode(content);
  return btoa(String.fromCharCode(...bytes));
};

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { user_id, email, first_name, last_name, quiz_data, is_basic, provider } = await req.json();
    
    const notificationType = is_basic ? 'BASIC' : 'COMPLETE';
    console.log(`📱 Sending ${notificationType} Telegram notification for user:`, { user_id, email, provider });

    const TELEGRAM_BOT_TOKEN = Deno.env.get("TELEGRAM_BOT_TOKEN");
    const TELEGRAM_CHAT_ID = Deno.env.get("TELEGRAM_CHAT_ID");

    if (!TELEGRAM_BOT_TOKEN || !TELEGRAM_CHAT_ID) {
      console.error('❌ Missing Telegram credentials - TELEGRAM_BOT_TOKEN:', !!TELEGRAM_BOT_TOKEN, 'TELEGRAM_CHAT_ID:', !!TELEGRAM_CHAT_ID);
      throw new Error("Telegram credentials not configured");
    }

    // Escape all user-provided values
    const safeEmail = escapeMarkdown(email);
    const safeFirstName = escapeMarkdown(first_name);
    const safeLastName = escapeMarkdown(last_name);
    const safeName = [safeFirstName, safeLastName].filter(Boolean).join(' ') || 'Not provided';
    const safeProvider = provider ? ` \\(${escapeMarkdown(provider)}\\)` : '';
    
    // Format date
    const dateStr = new Date().toLocaleString('en-US', { 
      timeZone: 'Europe/Bucharest',
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit'
    });
    const safeDate = escapeMarkdown(dateStr);
    
    let message = '';
    
    if (is_basic) {
      // Basic notification - just registration
      const providerEmoji = provider === 'google' ? '🔵' : '📧';
      const providerText = provider === 'google' ? 'Google' : 'Email';

      message = `${providerEmoji} *New Registration* \\(${escapeMarkdown(providerText)}\\)\n\n`;
      message += `📧 Email: ${safeEmail}\n`;
      message += `👤 Name: ${safeName}\n`;
      message += `🆔 ID: \`${user_id}\`\n`;
      message += `📅 Date: ${safeDate}\n\n`;
      message += `✅ _User registered successfully_`;
    } else {
      // Complete notification with quiz data - structured format
      message = `🎉 *NEW USER \\- COMPLETE DATA*\n\n`;
      
      // Personal Information Section
      message += `👤 *PERSONAL INFORMATION*\n`;
      message += `━━━━━━━━━━━━━━━━━━━━━━\n`;
      message += `• Name: ${safeName}\n`;
      message += `• Email: ${safeEmail}\n`;
      
      if (quiz_data) {
        const safePhone = escapeMarkdown(quiz_data.contact_phone) || 'Not provided';
        const safeLanguage = escapeMarkdown(quiz_data.preferred_language) || 'Not specified';
        message += `• Phone: ${safePhone}\n`;
        message += `• Language: ${safeLanguage}\n`;
      }
      message += `• User ID: \`${user_id}\`\n\n`;

      // Business Information Section
      if (quiz_data) {
        const safeBudget = escapeMarkdown(quiz_data.telephony_budget) || 'Not specified';
        const safeEmployees = escapeMarkdown(quiz_data.employees_count) || 'Not specified';
        const safeIndustry = escapeMarkdown(quiz_data.industry) || 'Not specified';
        const safeHowHeard = escapeMarkdown(quiz_data.how_heard) || 'Not specified';
        
        message += `📊 *BUSINESS INFORMATION*\n`;
        message += `━━━━━━━━━━━━━━━━━━━━━━\n`;
        message += `• Monthly Budget: ${safeBudget}\n`;
        message += `• Employees: ${safeEmployees}\n`;
        message += `• Industry: ${safeIndustry}\n`;
        message += `• How heard about us: ${safeHowHeard}\n\n`;
      }

      message += `📅 *Registration Date:* ${safeDate}\n\n`;
      message += `🔒 _Confidential Information_`;
    }

    console.log('📤 Sending message to Telegram...');

    // Send Telegram message
    const telegramUrl = `https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/sendMessage`;
    
    const telegramResponse = await fetch(telegramUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        chat_id: TELEGRAM_CHAT_ID,
        text: message,
        parse_mode: 'MarkdownV2',
      }),
    });

    const telegramData = await telegramResponse.json();
    
    if (!telegramResponse.ok) {
      console.error('❌ Telegram API error:', telegramData);
      console.error('❌ Message that failed:', message);
      throw new Error(`Telegram API error: ${telegramData.description || 'Unknown error'}`);
    }

    console.log('✅ Telegram notification sent successfully');

    // Send PDF document if complete data
    if (!is_basic && quiz_data) {
      console.log('📄 Generating and sending PDF document...');
      
      try {
        // Create PDF content
        const pdfData = {
          firstName: first_name || '',
          lastName: last_name || '',
          email: email || '',
          userId: user_id,
          phone: quiz_data.contact_phone || '',
          language: quiz_data.preferred_language || '',
          howHeard: quiz_data.how_heard || '',
          budget: quiz_data.telephony_budget || '',
          employees: quiz_data.employees_count || '',
          industry: quiz_data.industry || '',
          date: dateStr,
        };

        // Create a simple text-based document since we can't use full PDF libraries
        const documentContent = `
╔════════════════════════════════════════════════════════════════╗
║                      AGENTAUTO AI                                 ║
║                  Client Information Report                      ║
╠════════════════════════════════════════════════════════════════╣
║                                                                 ║
║  PERSONAL INFORMATION                                          ║
║  ─────────────────────────────────────────────────────────────  ║
║  Name:               ${(pdfData.firstName + ' ' + pdfData.lastName).padEnd(40)}║
║  Email:              ${pdfData.email.padEnd(40)}║
║  Phone:              ${(pdfData.phone || 'Not provided').padEnd(40)}║
║  Preferred Language: ${(pdfData.language || 'Not specified').padEnd(40)}║
║  User ID:            ${pdfData.userId.padEnd(40)}║
║                                                                 ║
║  BUSINESS INFORMATION                                          ║
║  ─────────────────────────────────────────────────────────────  ║
║  Monthly Budget:     ${(pdfData.budget || 'Not specified').padEnd(40)}║
║  Employees:          ${(pdfData.employees || 'Not specified').padEnd(40)}║
║  Industry:           ${(pdfData.industry || 'Not specified').padEnd(40)}║
║  Discovery Source:   ${(pdfData.howHeard || 'Not specified').padEnd(40)}║
║                                                                 ║
║  ─────────────────────────────────────────────────────────────  ║
║  Registration Date:  ${pdfData.date.padEnd(40)}║
║                                                                 ║
╚════════════════════════════════════════════════════════════════╝

This document contains confidential client information.
Generated by Agent Automation System.
`;

        // Send as document
        const encoder = new TextEncoder();
        const documentBytes = encoder.encode(documentContent);
        const base64Content = btoa(String.fromCharCode(...documentBytes));

        // Use sendDocument API with file upload via multipart/form-data
        const formData = new FormData();
        formData.append('chat_id', TELEGRAM_CHAT_ID);
        
        // Create blob from content
        const blob = new Blob([documentContent], { type: 'text/plain' });
        const fileName = `agentauto_client_${first_name || 'user'}_${last_name || ''}_${new Date().toISOString().split('T')[0]}.txt`;
        formData.append('document', blob, fileName);
        formData.append('caption', `📋 Client Report: ${first_name || ''} ${last_name || ''}`);

        const docResponse = await fetch(`https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/sendDocument`, {
          method: 'POST',
          body: formData,
        });

        const docData = await docResponse.json();
        
        if (!docResponse.ok) {
          console.error('❌ Error sending document:', docData);
        } else {
          console.log('✅ PDF document sent successfully');
        }
      } catch (pdfError) {
        console.error('❌ Error generating/sending PDF:', pdfError);
        // Don't fail the whole notification if PDF fails
      }
    }

    return new Response(
      JSON.stringify({ success: true, message: 'Notification sent' }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error('❌ Error in telegram-notify-signup:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { 
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" }
      }
    );
  }
});
