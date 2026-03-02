// @ts-nocheck
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.49.9'
import { Resend } from 'https://esm.sh/resend@2.0.0'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
}

interface SendAnnouncementRequest {
  announcement_id: string;
}

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    // Initialize clients
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    const resendApiKey = Deno.env.get('RESEND_API_KEY')!
    
    const supabase = createClient(supabaseUrl, supabaseKey)
    const resend = new Resend(resendApiKey)

    // Get auth user
    const authHeader = req.headers.get('Authorization')
    if (!authHeader) {
      throw new Error('Nu sunteți autentificat')
    }

    const { data: { user }, error: authError } = await supabase.auth.getUser(
      authHeader.replace('Bearer ', '')
    )

    if (authError || !user) {
      throw new Error('Nu sunteți autentificat')
    }

    // Check if user is admin
    const { data: isAdmin, error: adminError } = await supabase.rpc('is_admin_user', {
      _user_id: user.id
    })

    if (adminError || !isAdmin) {
      throw new Error('Nu aveți permisiuni de administrator')
    }

    const { announcement_id } = await req.json() as SendAnnouncementRequest

    if (!announcement_id) {
      throw new Error('ID-ul anunțului este necesar')
    }

    // Get announcement details
    const { data: announcement, error: announcementError } = await supabase
      .from('marketing_announcements')
      .select('*')
      .eq('id', announcement_id)
      .single()

    if (announcementError || !announcement) {
      throw new Error('Anunțul nu a fost găsit')
    }

    // Update status to sending
    await supabase
      .from('marketing_announcements')
      .update({ send_status: 'sending' })
      .eq('id', announcement_id)

    // Get target users based on target_users filter
    let query = supabase
      .from('profiles')
      .select('id, email, first_name, last_name, plan, account_type')

    // Apply filters based on target_users
    if (announcement.target_users === 'premium') {
      query = query.in('plan', ['professional', 'enterprise', 'business'])
    } else if (announcement.target_users === 'free') {
      query = query.eq('plan', 'starter')
    } else if (announcement.target_users === 'active') {
      // Get users who made a call in the last 30 days
      const thirtyDaysAgo = new Date()
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30)
      
      const { data: activeUsers } = await supabase
        .from('call_history')
        .select('user_id')
        .gte('created_at', thirtyDaysAgo.toISOString())
        .not('user_id', 'is', null)
      
      const activeUserIds = [...new Set(activeUsers?.map(u => u.user_id) || [])]
      query = query.in('id', activeUserIds)
    }

    // Exclude banned users
    query = query.neq('account_type', 'banned')

    const { data: users, error: usersError } = await query

    if (usersError) {
      throw new Error(`Eroare la preluarea utilizatorilor: ${usersError.message}`)
    }

    if (!users || users.length === 0) {
      throw new Error('Nu au fost găsiți utilizatori pentru trimiterea anunțului')
    }

    console.log(`Trimitere anunț către ${users.length} utilizatori...`)

    // Send emails respecting rate limits (2 per second for Resend)
    let emailsSent = 0
    let emailsFailed = 0
    const batchSize = 2 // Respect Resend rate limit
    const delayBetweenBatches = 1100 // 1.1 seconds delay

    console.log(`Starting to send ${users.length} emails with rate limiting...`)

    for (let i = 0; i < users.length; i += batchSize) {
      const batch = users.slice(i, i + batchSize)
      console.log(`Processing batch ${Math.floor(i / batchSize) + 1}/${Math.ceil(users.length / batchSize)}`)
      
      const emailPromises = batch.map(async (targetUser) => {
        try {
          if (!targetUser.email) {
            console.log(`User ${targetUser.id} nu are email`)
            return false
          }

          const firstName = targetUser.first_name || 'Utilizator'
          
          // Get announcement type badge color
          const getBadgeColor = (type: string) => {
            switch(type) {
              case 'success': return '#10b981'
              case 'warning': return '#f59e0b'
              case 'promotion': return '#8b5cf6'
              default: return '#3b82f6'
            }
          }

          const badgeColor = getBadgeColor(announcement.announcement_type)
          const typeLabel = {
            'info': '📢 Informație',
            'warning': '⚠️ Atenție',
            'success': '✅ Succes',
            'promotion': '🎉 Promoție'
          }[announcement.announcement_type] || '📢 Informație'

          const html = `
            <!DOCTYPE html>
            <html>
              <head>
                <meta charset="utf-8">
                <meta name="viewport" content="width=device-width, initial-scale=1.0">
                <title>${announcement.title}</title>
              </head>
              <body style="margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', 'Roboto', 'Oxygen', 'Ubuntu', 'Cantarell', 'Fira Sans', 'Droid Sans', 'Helvetica Neue', sans-serif; background-color: #f3f4f6;">
                <table width="100%" cellpadding="0" cellspacing="0" style="background-color: #f3f4f6; padding: 40px 20px;">
                  <tr>
                    <td align="center">
                      <table width="600" cellpadding="0" cellspacing="0" style="background-color: #ffffff; border-radius: 8px; box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1); overflow: hidden;">
                        <!-- Header -->
                        <tr>
                          <td style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); padding: 40px 30px; text-align: center;">
                            <h1 style="margin: 0; color: #ffffff; font-size: 28px; font-weight: bold;">Kalina AI</h1>
                          </td>
                        </tr>
                        
                        <!-- Content -->
                        <tr>
                          <td style="padding: 40px 30px;">
                            <p style="margin: 0 0 20px; color: #374151; font-size: 16px;">Bună, ${firstName}!</p>
                            
                            <!-- Announcement Badge -->
                            <div style="display: inline-block; background-color: ${badgeColor}; color: #ffffff; padding: 8px 16px; border-radius: 20px; font-size: 14px; font-weight: 600; margin-bottom: 20px;">
                              ${typeLabel}
                            </div>
                            
                            <!-- Title -->
                            <h2 style="margin: 20px 0; color: #111827; font-size: 24px; font-weight: bold;">
                              ${announcement.title}
                            </h2>
                            
                            <!-- Message -->
                            <div style="margin: 20px 0; color: #4b5563; font-size: 16px; line-height: 1.6;">
                              ${announcement.message.replace(/\n/g, '<br>')}
                            </div>
                            
                            <!-- CTA Button (if promotion) -->
                            ${announcement.announcement_type === 'promotion' ? `
                              <div style="margin: 30px 0; text-align: center;">
                                <a href="https://app.agentauto.app/pricing" style="display: inline-block; background-color: #8b5cf6; color: #ffffff; padding: 14px 28px; border-radius: 8px; text-decoration: none; font-weight: 600; font-size: 16px;">
                                  Vezi Oferta
                                </a>
                              </div>
                            ` : ''}
                          </td>
                        </tr>
                        
                        <!-- Footer -->
                        <tr>
                          <td style="background-color: #f9fafb; padding: 30px; text-align: center; border-top: 1px solid #e5e7eb;">
                            <p style="margin: 0 0 10px; color: #6b7280; font-size: 14px;">
                              Primești acest email pentru că ai un cont pe Kalina AI
                            </p>
                            <p style="margin: 0; color: #6b7280; font-size: 14px;">
                              © ${new Date().getFullYear()} Kalina AI. Toate drepturile rezervate.
                            </p>
                          </td>
                        </tr>
                      </table>
                    </td>
                  </tr>
                </table>
              </body>
            </html>
          `

          // Use onboarding@resend.dev for testing or ensure domain is verified
          const { error: sendError } = await resend.emails.send({
            from: 'Kalina AI <onboarding@resend.dev>',
            to: [targetUser.email],
            subject: announcement.title,
            html: html,
            reply_to: 'support@agentauto.app'
          })

          if (sendError) {
            console.error(`Eroare la trimiterea email către ${targetUser.email}:`, sendError)
            return false
          }

          console.log(`Email trimis cu succes către ${targetUser.email}`)
          return true
        } catch (error) {
          console.error(`Eroare la procesarea utilizatorului ${targetUser.id}:`, error)
          return false
        }
      })

      // Send emails sequentially with delay
      for (let j = 0; j < emailPromises.length; j++) {
        const result = await emailPromises[j]
        if (result) {
          emailsSent++
        } else {
          emailsFailed++
        }
        
        // Small delay between individual emails
        if (j < emailPromises.length - 1) {
          await new Promise(resolve => setTimeout(resolve, 550)) // ~2 emails per second
        }
      }

      // Create in-app notifications for each user in the batch
      const notificationInserts = batch.map((targetUser) => ({
        user_id: targetUser.id,
        announcement_id: announcement_id,
        title: announcement.title,
        message: announcement.message,
        type: announcement.announcement_type,
        is_read: false,
      }))

      const { error: notificationError } = await supabase
        .from('user_notifications')
        .insert(notificationInserts)

      if (notificationError) {
        console.error('Eroare la crearea notificărilor:', notificationError)
      }

      console.log(`Batch complete: ${emailsSent} sent, ${emailsFailed} failed`)

      // Delay between batches
      if (i + batchSize < users.length) {
        await new Promise(resolve => setTimeout(resolve, delayBetweenBatches))
      }
    }

    console.log(`Email sending complete: ${emailsSent}/${users.length} sent, ${emailsFailed} failed`)

    // Update announcement with results
    await supabase
      .from('marketing_announcements')
      .update({
        send_status: 'completed',
        total_recipients: users.length,
        emails_sent: emailsSent,
        emails_failed: emailsFailed,
        sent_at: new Date().toISOString()
      })
      .eq('id', announcement_id)

    // Log admin action
    await supabase.rpc('log_admin_action', {
      p_admin_user_id: user.id,
      p_action: 'SEND_MARKETING_ANNOUNCEMENT',
      p_details: {
        announcement_id,
        title: announcement.title,
        total_recipients: users.length,
        emails_sent: emailsSent,
        emails_failed: emailsFailed
      }
    })

    return new Response(
      JSON.stringify({
        success: true,
        message: `Anunțul a fost trimis cu succes către ${emailsSent} utilizatori${emailsFailed > 0 ? ` (${emailsFailed} eșuați)` : ''}`,
        data: {
          total_recipients: users.length,
          emails_sent: emailsSent,
          emails_failed: emailsFailed
        }
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      },
    )
  } catch (error) {
    console.error('Error in send-marketing-announcement function:', error)
    
    return new Response(
      JSON.stringify({ 
        error: error.message || 'A apărut o eroare la trimiterea anunțului'
      }),
      {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      },
    )
  }
})