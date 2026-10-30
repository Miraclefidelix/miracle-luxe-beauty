const SUPABASE_URL = "https://dkegbhedimocwlngcqmn.supabase.co";

const SUPABASE_ANON_KEY = "sb_publishable_RTfTE5_Ng_qqS8PXL54CMQ_q8GMQ1Ab";

window.supabaseClient = window.supabase.createClient(
    SUPABASE_URL,
    SUPABASE_ANON_KEY
);
