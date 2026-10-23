declare namespace Cloudflare {
  interface Env {
    DB?: D1Database;
    BUCKET?: R2Bucket;
    NEXTROLE_OWNER_EMAIL?: string;
    KEYRING_ENCRYPTION_KEY?: string;
    VAPID_PUBLIC_KEY?: string;
    VAPID_PRIVATE_KEY?: string;
    VAPID_SUBJECT?: string;
    NEXTROLE_MAIL_APPROVAL?: string;
    NEXTROLE_MAIL_API_KEY?: string;
    NEXTROLE_MAIL_FROM?: string;
    NEXTROLE_MAIL_DAILY_BUDGET?: string;
    NEXTROLE_PUBLIC_URL?: string;
    NEXTROLE_BRIDGE_SECRET?: string;
    NEXTROLE_RENDER_BRIDGE_SECRET?: string;
    NEXTROLE_BRIDGE_ISSUER?: string;
    NEXTROLE_VERCEL_ORIGIN?: string;
    SERPAPI_API_KEY?: string;
  }
}
