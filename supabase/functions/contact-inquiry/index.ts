import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.3';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface ContactFormData {
  destinations: string;
  travelSeason: string;
  duration: string;
  budgetRange: [number, number];
  tourOfInterest?: string;
  comments?: string;
  firstName: string;
  lastName: string;
  email: string;
  phoneCountryCode: string;
  phoneNumber: string;
  preferredContactMethods: string[];
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    // Initialize Supabase client
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    // Parse request body
    const formData: ContactFormData = await req.json();

    // Validate required fields
    const requiredFields = ['destinations', 'travelSeason', 'duration', 'firstName', 'lastName', 'email', 'phoneCountryCode', 'phoneNumber'];
    for (const field of requiredFields) {
      if (!formData[field as keyof ContactFormData]) {
        return new Response(
          JSON.stringify({ error: `Missing required field: ${field}` }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
    }

    // Store inquiry in database
    const { data: inquiry, error: dbError } = await supabaseClient
      .from('contact_inquiries')
      .insert({
        destinations: formData.destinations,
        travel_season: formData.travelSeason,
        duration: formData.duration,
        budget_min: formData.budgetRange[0],
        budget_max: formData.budgetRange[1],
        tour_of_interest: formData.tourOfInterest,
        comments: formData.comments,
        first_name: formData.firstName,
        last_name: formData.lastName,
        email: formData.email,
        phone_country_code: formData.phoneCountryCode,
        phone_number: formData.phoneNumber,
        preferred_contact_methods: formData.preferredContactMethods,
        created_at: new Date().toISOString(),
        status: 'new'
      })
      .select()
      .single();

    if (dbError) {
      console.error('Database error:', dbError);
      return new Response(
        JSON.stringify({ error: 'Failed to save inquiry' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Send email notification using Resend
    const resendApiKey = Deno.env.get('RESEND_API_KEY');
    if (!resendApiKey) {
      console.error('RESEND_API_KEY not configured');
      // Still return success since the inquiry was saved to DB
      return new Response(
        JSON.stringify({ success: true, message: 'Inquiry saved but email notification failed' }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Format budget display
    const budgetDisplay = `£${formData.budgetRange[0].toLocaleString()} - £${formData.budgetRange[1].toLocaleString()}${formData.budgetRange[1] >= 20000 ? '+' : ''}`;

    // Format preferred contact methods
    const contactMethodsDisplay = formData.preferredContactMethods.join(', ');

    // Create email content
    const emailHtml = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
        <div style="background-color: #00395c; color: white; padding: 20px; text-align: center;">
          <h1 style="margin: 0; font-size: 24px;">New Honeymoon Inquiry</h1>
          <p style="margin: 10px 0 0 0; opacity: 0.9;">From gomoons.com</p>
        </div>
        
        <div style="background-color: #f8f9fa; padding: 20px; border-left: 4px solid #00395c;">
          <h2 style="color: #00395c; margin-top: 0;">Customer Details</h2>
          <p><strong>Name:</strong> ${formData.firstName} ${formData.lastName}</p>
          <p><strong>Email:</strong> <a href="mailto:${formData.email}">${formData.email}</a></p>
          <p><strong>Phone:</strong> <a href="tel:${formData.phoneCountryCode}${formData.phoneNumber}">${formData.phoneCountryCode} ${formData.phoneNumber}</a></p>
          <p><strong>Preferred Contact:</strong> ${contactMethodsDisplay}</p>
        </div>

        <div style="background-color: white; padding: 20px; border: 1px solid #e9ecef;">
          <h2 style="color: #00395c; margin-top: 0;">Trip Requirements</h2>
          <p><strong>Destination:</strong> ${formData.destinations}</p>
          <p><strong>Travel Season:</strong> ${formData.travelSeason}</p>
          <p><strong>Duration:</strong> ${formData.duration}</p>
          <p><strong>Budget per person:</strong> ${budgetDisplay}</p>
          ${formData.tourOfInterest ? `<p><strong>Tour of Interest:</strong> ${formData.tourOfInterest}</p>` : ''}
          ${formData.comments ? `
            <div style="margin-top: 20px;">
              <strong>Additional Comments:</strong>
              <div style="background-color: #f8f9fa; padding: 15px; border-left: 3px solid #00395c; margin-top: 10px;">
                ${formData.comments.replace(/\n/g, '<br>')}
              </div>
            </div>
          ` : ''}
        </div>

        <div style="background-color: #e8f5e8; padding: 15px; text-align: center; margin-top: 20px;">
          <p style="margin: 0; color: #2d5a2d;">
            <strong>Inquiry ID:</strong> ${inquiry.id} | 
            <strong>Received:</strong> ${new Date().toLocaleString('en-GB')}
          </p>
        </div>
      </div>
    `;

    const emailPayload = {
      from: 'Moons Contact Form <noreply@gomoons.com>',
      to: ['info@gomoons.com'],
      subject: `New Honeymoon Inquiry - ${formData.firstName} ${formData.lastName}`,
      html: emailHtml,
      reply_to: formData.email
    };

    const emailResponse = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${resendApiKey}`,
      },
      body: JSON.stringify(emailPayload),
    });

    if (!emailResponse.ok) {
      const emailError = await emailResponse.text();
      console.error('Email sending failed:', emailError);
      // Still return success since the inquiry was saved to DB
      return new Response(
        JSON.stringify({ 
          success: true, 
          message: 'Inquiry saved successfully, but email notification failed',
          inquiryId: inquiry.id 
        }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    return new Response(
      JSON.stringify({ 
        success: true, 
        message: 'Inquiry submitted successfully',
        inquiryId: inquiry.id 
      }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Function error:', error);
    return new Response(
      JSON.stringify({ error: 'Internal server error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
}); 