// Premium paywall settings — shown to payers in the payment-required screen
// on premium invitations. Real card details come from .env (never committed
// to git) — set PREMIUM_CARD_NUMBER / PREMIUM_CARD_HOLDER there.
const CARD_NUMBER = process.env.PREMIUM_CARD_NUMBER || '0000 0000 0000 0000';
const CARD_HOLDER = process.env.PREMIUM_CARD_HOLDER || 'TODO: ISM FAMILIYA';

// Pay once per invitation, or pay more once to unlock everything account-wide.
const INVITATION_PRICE = Number(process.env.PREMIUM_INVITATION_PRICE) || 20000;
const MEMBERSHIP_PRICE = Number(process.env.PREMIUM_MEMBERSHIP_PRICE) || 50000;

// Layouts and event types that require payment before the public link works
// (unless the invitation owner has an active Premium membership).
const PREMIUM_LAYOUTS = ['shohona'];
const PREMIUM_EVENT_TYPES = ['sevgi_izhor'];

// Pages that require an active Premium membership to use at all.
const MEMBERSHIP_ONLY_FEATURES = ['gallery', 'qr-video'];

function requiresPayment(inv) {
  return PREMIUM_LAYOUTS.includes(inv.layout) || PREMIUM_EVENT_TYPES.includes(inv.event_type);
}

module.exports = {
  CARD_NUMBER,
  CARD_HOLDER,
  INVITATION_PRICE,
  MEMBERSHIP_PRICE,
  PREMIUM_LAYOUTS,
  PREMIUM_EVENT_TYPES,
  MEMBERSHIP_ONLY_FEATURES,
  requiresPayment
};
