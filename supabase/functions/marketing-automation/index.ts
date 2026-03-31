import { serve } from "https://deno.land/std@0.190.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface MarketingRequest {
  email: string;
  action: 'subscribe' | 'unsubscribe';
  source?: string;
}

const handler = async (req: Request): Promise<Response> => {
  // Handle CORS preflight requests
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { email, action, source }: MarketingRequest = await req.json();
    
    console.log(`Marketing automation triggered: ${action} for ${email} from ${source}`);

    // SendFox integration for "Ditax Registrierte Benutzer"
    const sendFoxApiKey = Deno.env.get('SENDFOX_API_KEY');
    if (sendFoxApiKey && action === 'subscribe') {
      try {
        console.log('Adding to SendFox automation...');
        
        // First, get all available lists to find the correct one
        const listsResponse = await fetch('https://api.sendfox.com/lists', {
          method: 'GET',
          headers: {
            'Authorization': `Bearer ${sendFoxApiKey}`,
            'Content-Type': 'application/json'
          }
        });
        
        if (!listsResponse.ok) {
          const errorText = await listsResponse.text();
          console.error(`SendFox Lists API error: ${listsResponse.status} - ${errorText}`);
          throw new Error(`Failed to fetch SendFox lists: ${errorText}`);
        }
        
        const listsData = await listsResponse.json();
        console.log('Available SendFox lists:', JSON.stringify(listsData, null, 2));
        
        // Find the "Ditax Registrierte Benutzer" list - exact match first
        let targetListId = null;
        if (listsData.data && Array.isArray(listsData.data)) {
          // Priority 1: Exact match for "Ditax Registrierte Benutzer"
          let targetList = listsData.data.find((list: any) => 
            list.name && list.name.toLowerCase() === 'ditax registrierte benutzer'
          );
          
          // Priority 2: Contains "registrierte benutzer" (but not just "ditax")
          if (!targetList) {
            targetList = listsData.data.find((list: any) => 
              list.name && list.name.toLowerCase().includes('registrierte benutzer')
            );
          }
          
          if (targetList) {
            targetListId = targetList.id;
            console.log(`Found target list: "${targetList.name}" (ID: ${targetListId})`);
          } else {
            console.warn('Target list "Ditax Registrierte Benutzer" not found. Available lists:', 
              listsData.data.map((l: any) => `${l.name} (ID: ${l.id})`).join(', '));
          }
        }
        
        // Hardcoded fallback to correct list ID
        if (!targetListId) {
          targetListId = 539077; // "Ditax Registrierte Benutzer" list ID
          console.log(`Using hardcoded fallback list ID: ${targetListId}`);
        }
        
        // Add contact to the identified list
        const response = await fetch('https://api.sendfox.com/contacts', {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${sendFoxApiKey}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            email: email,
            lists: [targetListId],
            tags: [source || 'registration', 'ditax_user']
          })
        });
        
        if (!response.ok) {
          const errorText = await response.text();
          console.error(`SendFox Contact API error: ${response.status} - ${errorText}`);
          // Log the error but don't throw to continue with welcome email
        } else {
          const responseData = await response.json();
          console.log('Successfully added to SendFox automation:', responseData);
        }
      } catch (sendFoxError) {
        console.error('SendFox integration failed:', sendFoxError);
        // Continue with welcome email even if SendFox fails
      }
    }

    // Send welcome email via Resend using direct HTTP calls
    const resendApiKey = Deno.env.get('RESEND_API_KEY');
    
    if (resendApiKey && action === 'subscribe') {
      try {
        const emailResponse = await fetch('https://api.resend.com/emails', {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${resendApiKey}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            from: 'Ditax <noreply@ditax.ch>',
            to: [email],
            subject: 'Willkommen bei Ditax!',
            html: `
              <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
                <h1 style="color: #1d64ff; text-align: center;">Willkommen bei Ditax!</h1>
                <p>Vielen Dank für Ihre Anmeldung. Wir freuen uns, Sie bei Ditax begrüßen zu dürfen.</p>
                <p>Ihre Steuererklärung war noch nie so einfach!</p>
                <p>Falls Sie Fragen haben, können Sie uns jederzeit über den Chat in der App kontaktieren.</p>
                <p>Viele Grüße,<br>Ihr Ditax Team</p>
              </div>
            `,
          }),
        });

        if (emailResponse.ok) {
          const emailResult = await emailResponse.json();
          console.log('Welcome email sent successfully to:', email, emailResult);
        } else {
          const errorText = await emailResponse.text();
          console.error('Failed to send welcome email:', emailResponse.status, errorText);
        }
      } catch (emailError) {
        console.error('Failed to send welcome email:', emailError);
        // Don't throw error, as this is not critical
      }
    }

    return new Response(
      JSON.stringify({ 
        success: true, 
        message: `Marketing ${action} processed for ${email}` 
      }),
      {
        status: 200,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      }
    );

  } catch (error: any) {
    console.error("Error in marketing automation:", error);
    return new Response(
      JSON.stringify({ error: error.message }),
      {
        status: 500,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      }
    );
  }
};

serve(handler);