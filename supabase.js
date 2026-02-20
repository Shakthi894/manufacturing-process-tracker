import { createClient } from "https://cdn.jsdelivr.net/npm/@supabase/supabase-js/+esm";

const supabaseUrl = "https://hstzklmrrgaprjrftdgt.supabase.co";
const supabaseKey = "sb_publishable_kvYeJNx0-NrNvnmEkFdyKw__4LtfCnP";

export const supabase = createClient(supabaseUrl, supabaseKey);
