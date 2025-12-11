
import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.3'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    const resendApiKey = Deno.env.get('RESEND_API_KEY')!

    const supabase = createClient(supabaseUrl, supabaseServiceKey)

    // Get users with unread messages older than 24 hours
    const { data: unreadMessages, error } = await supabase
      .from('chat_messages')
      .select(`
        recipient_id,
        created_at,
        profiles:recipient_id (
          email,
          first_name,
          last_name
        )
      `)
      .eq('read', false)
      .lt('created_at', new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString())
      .not('profiles', 'is', null)

    if (error) {
      console.error('Error fetching unread messages:', error)
      return new Response(JSON.stringify({ error: error.message }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    // Group by recipient to avoid duplicate emails
    const userMap = new Map()
    unreadMessages?.forEach(msg => {
      if (msg.profiles && !userMap.has(msg.recipient_id)) {
        const profile = Array.isArray(msg.profiles) ? msg.profiles[0] : msg.profiles;
        userMap.set(msg.recipient_id, {
          email: profile.email,
          firstName: profile.first_name,
          lastName: profile.last_name,
          userId: msg.recipient_id
        })
      }
    })

    let emailsSent = 0

    // Send emails to users who haven't received one in the last 24 hours
    for (const user of userMap.values()) {
      // Check if email was already sent in last 24 hours
      const { data: recentEmail } = await supabase
        .from('email_notifications')
        .select('id')
        .eq('user_id', user.userId)
        .eq('notification_type', 'unread_messages')
        .gte('sent_at', new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString())
        .limit(1)

      if (recentEmail && recentEmail.length > 0) {
        console.log(`Email already sent to user ${user.userId} in last 24h`)
        continue
      }

      // Send email via Resend
      const emailResponse = await fetch('https://api.resend.com/emails', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${resendApiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          from: 'noreply@ditax.de',
          to: user.email,
          subject: 'Ungelesene Nachrichten - DiTax Support',
          html: `
            <!DOCTYPE html>
            <html>
            <head>
              <meta charset="utf-8">
              <meta name="viewport" content="width=device-width, initial-scale=1.0">
              <title>Ungelesene Nachrichten</title>
            </head>
            <body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
              <div style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); padding: 30px; text-align: center; border-radius: 10px 10px 0 0;">
                <h1 style="color: white; margin: 0; font-size: 28px;">DiTax Support</h1>
              </div>
              
              <div style="background: #f8f9fa; padding: 30px; border-radius: 0 0 10px 10px; box-shadow: 0 4px 6px rgba(0,0,0,0.1);">
                <h2 style="color: #333; margin-top: 0;">Hallo ${user.firstName || 'Liebe/r Nutzer/in'},</h2>
                
                <p style="font-size: 16px; margin-bottom: 20px;">
                  Sie haben ungelesene Nachrichten in Ihrem DiTax Support-Chat, die auf eine Antwort warten.
                </p>
                
                <div style="background: white; padding: 20px; border-radius: 8px; border-left: 4px solid #667eea; margin: 20px 0;">
                  <p style="margin: 0; color: #555;">
                    💬 <strong>Unser Support-Team hat Ihnen geantwortet!</strong><br>
                    Loggen Sie sich ein, um die Unterhaltung fortzusetzen.
                  </p>
                </div>
                
                <div style="text-align: center; margin: 30px 0;">
                  <a href="https://gqbhilftduwxjszznnzy.supabase.co/auth/v1/verify?token=&type=recovery&redirect_to=https://ditax.lovableproject.com/?openChat=true" 
                     style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 15px 30px; text-decoration: none; border-radius: 25px; font-weight: bold; font-size: 16px; display: inline-block; box-shadow: 0 4px 15px rgba(102, 126, 234, 0.3);">
                    📱 Chat öffnen
                  </a>
                </div>
                
                <p style="font-size: 14px; color: #666; margin-top: 30px; padding-top: 20px; border-top: 1px solid #ddd;">
                  Diese E-Mail wurde automatisch gesendet, da Sie ungelesene Nachrichten haben.<br>
                  Sie erhalten maximal eine Erinnerung pro Tag.
                </p>
              </div>
            </body>
            </html>
          `
        }),
      })

      if (emailResponse.ok) {
        // Log successful email send
        await supabase
          .from('email_notifications')
          .insert({
            user_id: user.userId,
            notification_type: 'unread_messages'
          })
        
        emailsSent++
        console.log(`Email sent successfully to ${user.email}`)
      } else {
        const errorData = await emailResponse.text()
        console.error(`Failed to send email to ${user.email}:`, errorData)
      }
    }

    return new Response(
      JSON.stringify({ 
        message: `Processed ${userMap.size} users with unread messages`, 
        emailsSent 
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )

  } catch (error) {
    console.error('Error in unread-message-notifications:', error)
    return new Response(JSON.stringify({ error: (error as Error).message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }
})
