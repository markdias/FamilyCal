import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.7";

const SUPABASE_URL = Deno.env.get('SUPABASE_URL') || '';
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') || '';

const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
    // Handle CORS preflight requests
    if (req.method === 'OPTIONS') {
        return new Response('ok', { headers: corsHeaders })
    }

    try {
        const url = new URL(req.url);
        const userId = url.searchParams.get('user_id');
        const token = url.searchParams.get('token');

        if (!userId || !token) {
            return new Response("Missing parameters", { status: 400, headers: corsHeaders });
        }

        const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

        // 1. Verify token
        const { data: prefs, error: prefsError } = await supabase
            .from('user_preferences')
            .select('calendar_token')
            .eq('user_id', userId)
            .eq('calendar_token', token)
            .single();

        if (prefsError || !prefs) {
            return new Response("Unauthorized", { status: 401, headers: corsHeaders });
        }

        // 2. Fetch user's family ID
        const { data: contact, error: contactError } = await supabase
            .from('contacts')
            .select('family_id')
            .eq('user_id', userId)
            .single();

        if (contactError || !contact) {
            return new Response("Family not found", { status: 404, headers: corsHeaders });
        }

        const familyId = contact.family_id;

        // 3. Fetch events (from 1 month ago to 2 years in the future)
        const startDate = new Date();
        startDate.setMonth(startDate.getMonth() - 1);
        const endDate = new Date();
        endDate.setFullYear(endDate.getFullYear() + 2);

        const { data: events, error: eventsError } = await supabase
            .from('events')
            .select(`
                id,
                title,
                description,
                location,
                start_time,
                end_time,
                is_all_day,
                category:event_categories(name, color),
                participants:event_participants(
                    contact:contacts(first_name)
                )
            `)
            .eq('family_id', familyId)
            .gte('start_time', startDate.toISOString())
            .lte('start_time', endDate.toISOString())
            .order('start_time', { ascending: true })
            .limit(2000);

        if (eventsError) {
            console.error(eventsError);
            return new Response("Error fetching events", { status: 500, headers: corsHeaders });
        }

        // 4. Generate iCalendar
        let ical = [
            "BEGIN:VCALENDAR",
            "VERSION:2.0",
            "PRODID:-//FamilyCal//NONSGML v1.0//EN",
            "CALSCALE:GREGORIAN",
            "METHOD:PUBLISH",
            `X-WR-CALNAME:FamilyCal`,
            "X-WR-TIMEZONE:UTC",
        ];

        events.forEach(event => {
            const start = new Date(event.start_time).toISOString().replace(/[-:]/g, '').split('.')[0] + 'Z';
            const end = new Date(event.end_time).toISOString().replace(/[-:]/g, '').split('.')[0] + 'Z';
            const created = new Date().toISOString().replace(/[-:]/g, '').split('.')[0] + 'Z';

            ical.push("BEGIN:VEVENT");
            ical.push(`UID:${event.id}@familycal.app`);
            ical.push(`DTSTAMP:${created}`);
            ical.push(`DTSTART:${start}`);
            ical.push(`DTEND:${end}`);
            // Format title with participants
            const participantNames = event.participants
                ?.map((p: any) => p.contact?.first_name)
                .filter(Boolean)
                .join(', ');

            const summary = participantNames
                ? `${event.title} (${participantNames})`
                : event.title;

            ical.push(`SUMMARY:${summary}`);
            if (event.description) ical.push(`DESCRIPTION:${event.description.replace(/\n/g, '\\n')}`);
            if (event.location) ical.push(`LOCATION:${event.location}`);
            if (event.category) ical.push(`CATEGORIES:${event.category.name}`);
            ical.push("END:VEVENT");
        });

        ical.push("END:VCALENDAR");

        return new Response(ical.join("\r\n"), {
            headers: {
                ...corsHeaders,
                "Content-Type": "text/calendar; charset=utf-8",
                "Content-Disposition": 'attachment; filename="familycal.ics"',
            },
        });

    } catch (err) {
        console.error(err);
        return new Response("Internal Server Error", { status: 500, headers: corsHeaders });
    }
})
