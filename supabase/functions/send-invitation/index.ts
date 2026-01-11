import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.7";

const corsHeaders = {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Headers":
        "authorization, x-client-info, apikey, content-type",
};

interface InvitationPayload {
    type: "INSERT";
    table: string;
    record: {
        id: string;
        family_id: string;
        email: string;
        first_name: string;
        invitation_token: string;
    };
    schema: string;
}

serve(async (req) => {
    if (req.method === "OPTIONS") {
        return new Response("ok", { headers: corsHeaders });
    }

    try {
        const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
        const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
        const appUrl = Deno.env.get("APP_URL") || "https://familycal-app.netlify.app";

        console.log("Environment Check:", {
            hasUrl: !!supabaseUrl,
            hasKey: !!supabaseServiceKey,
            appUrl
        });

        const supabase = createClient(supabaseUrl, supabaseServiceKey);
        const payload: InvitationPayload = await req.json();

        console.log("Received payload:", JSON.stringify(payload, null, 2));

        const { record } = payload;
        if (!record || !record.email) {
            throw new Error("Missing record or email in payload");
        }

        const inviteLink = `${appUrl}/accept-invite?token=${record.invitation_token}`;

        console.log(`Triggering built-in Supabase invitation for ${record.email}`);

        // Use Supabase's built-in Auth invite system
        // This sends the "Invite" email template configured in your Auth settings.
        // We pass the custom invitation link as the redirectTo parameter.
        const { error: inviteError } = await supabase.auth.admin.inviteUserByEmail(
            record.email,
            {
                redirectTo: inviteLink,
                data: {
                    family_id: record.family_id,
                    invitation_token: record.invitation_token,
                    first_name: record.first_name,
                },
            }
        );

        if (inviteError) {
            throw inviteError;
        }

        console.log(`Successfully triggered built-in invitation for ${record.email}`);

        return new Response(JSON.stringify({ success: true }), {
            headers: { ...corsHeaders, "Content-Type": "application/json" },
            status: 200,
        });
    } catch (error: any) {
        console.error("Error triggering invitation:", error);
        return new Response(JSON.stringify({ error: error.message }), {
            headers: { ...corsHeaders, "Content-Type": "application/json" },
            status: 500,
        });
    }
});
