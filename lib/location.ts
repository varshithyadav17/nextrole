/** Whole-place matching; source country codes take precedence over city guesses. */
const countryNames: Record<string, string[]> = {
  IN: ['india'], US: ['united states', 'usa', 'us'], GB: ['united kingdom', 'uk'],
  CA: ['canada'], AU: ['australia'], SG: ['singapore'], DE: ['germany'], FR: ['france'],
  NL: ['netherlands'], JP: ['japan'], BR: ['brazil'], MX: ['mexico'], NZ: ['new zealand'],
  PL: ['poland'], IE: ['ireland'], ES: ['spain'], IT: ['italy'], AE: ['united arab emirates', 'uae'],
};
function normalize(value: string) { return value.toLowerCase().replace(/bangalore/g, 'bengaluru').trim(); }
export function containsPlace(text: string, place: string) {
  const escaped = normalize(place).replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  return !!escaped && new RegExp('(^|[^a-z0-9])' + escaped + '($|[^a-z0-9])', 'i').test(normalize(text));
}
export function locationFit(job: { location: string; mode: string; countryCodes?: string[];sourceCategory?:string }, preferences: string[]) {
  const text = normalize(job.sourceCategory==='job-board'&&/^anywhere$/i.test(job.location.trim())?'Remote · region not specified':job.location);
  const explicit = [...new Set([...(job.countryCodes || []), ...Object.entries(countryNames)
    .filter(([, names]) => names.some(name => containsPlace(text, name))).map(([code]) => code)])];
  const indiaCity = /\b(?:bengaluru|hyderabad|mumbai|pune|delhi|noida|gurugram|gurgaon|chennai|ahmedabad|kolkata)\b/.test(text);
  const worldwide = job.mode === 'Remote' && /\b(?:worldwide|anywhere|global)\b/.test(text) && !explicit.length;
  const matches = !preferences.length || preferences.some(preference => {
    const place = normalize(preference);
    if (place === 'anywhere') return true;
    const country = Object.entries(countryNames).find(([code, names]) => code.toLowerCase() === place || names.includes(place))?.[0];
    if (country) return explicit.includes(country) || country === 'IN' && !explicit.length && indiaCity;
    return containsPlace(text, place);
  });
  return { matches: matches || worldwide, worldwide, unknownRemote: job.mode === 'Remote' && !explicit.length && !indiaCity && !worldwide };
}
