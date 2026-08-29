// Premium paywall settings. Replace CARD_NUMBER / CARD_HOLDER with the real
// receiving card before going live — these are shown to payers in the
// payment-required screen on premium invitations.
const CARD_NUMBER = '0000 0000 0000 0000';
const CARD_HOLDER = "TODO: ISM FAMILIYA";
const PRICE = 20000;

// Layouts and event types that require payment before the public link works.
const PREMIUM_LAYOUTS = ['shohona'];
const PREMIUM_EVENT_TYPES = ['sevgi_izhor'];

function isPremiumInvitation(inv) {
  return PREMIUM_LAYOUTS.includes(inv.layout) || PREMIUM_EVENT_TYPES.includes(inv.event_type);
}

module.exports = { CARD_NUMBER, CARD_HOLDER, PRICE, PREMIUM_LAYOUTS, PREMIUM_EVENT_TYPES, isPremiumInvitation };
