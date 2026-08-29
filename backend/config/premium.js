// Premium paywall settings — shown to payers in the payment-required screen
// on premium invitations. Real card details come from .env (never committed
// to git) — set PREMIUM_CARD_NUMBER / PREMIUM_CARD_HOLDER there.
const CARD_NUMBER = process.env.PREMIUM_CARD_NUMBER || '0000 0000 0000 0000';
const CARD_HOLDER = process.env.PREMIUM_CARD_HOLDER || 'TODO: ISM FAMILIYA';
const PRICE = Number(process.env.PREMIUM_PRICE) || 20000;

// Layouts and event types that require payment before the public link works.
const PREMIUM_LAYOUTS = ['shohona'];
const PREMIUM_EVENT_TYPES = ['sevgi_izhor'];

function isPremiumInvitation(inv) {
  return PREMIUM_LAYOUTS.includes(inv.layout) || PREMIUM_EVENT_TYPES.includes(inv.event_type);
}

module.exports = { CARD_NUMBER, CARD_HOLDER, PRICE, PREMIUM_LAYOUTS, PREMIUM_EVENT_TYPES, isPremiumInvitation };
