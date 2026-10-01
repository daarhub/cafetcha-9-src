// ---------------------------------------------------------------------------
// Shared delivery configuration — the single source of truth for the 26
// barangays of Hagonoy, Bulacan and their delivery fees. Used by the Delivery
// Info page, the profile address book and the checkout flow, so the options
// and fees can never drift apart.
// ---------------------------------------------------------------------------

export const DELIVERY_FEES = [
  { barangay: "Santo Niño", fee: "FREE" },
  { barangay: "San Pedro", fee: "₱10" },
  { barangay: "San Nicolas", fee: "₱10" },
  { barangay: "San Agustin", fee: "₱10" },
  { barangay: "San Jose", fee: "₱10" },
  { barangay: "Santa Monica", fee: "₱10" },
  { barangay: "San Sebastian", fee: "₱15" },
  { barangay: "Sagrada Familia", fee: "₱15" },
  { barangay: "Mercado", fee: "₱15" },
  { barangay: "Santa Elena", fee: "₱15" },
  { barangay: "San Miguel", fee: "₱15" },
  { barangay: "San Pablo", fee: "₱15" },
  { barangay: "Tampok", fee: "₱15" },
  { barangay: "San Juan", fee: "₱20" },
  { barangay: "San Isidro", fee: "₱20" },
  { barangay: "Palapat", fee: "₱20" },
  { barangay: "Carillo", fee: "₱20" },
  { barangay: "Abulalas", fee: "₱20" },
  { barangay: "Santa Cruz", fee: "₱20" },
  { barangay: "Santo Rosario", fee: "₱20" },
  { barangay: "San Roque", fee: "₱25" },
  { barangay: "San Pascual", fee: "₱25" },
  { barangay: "Pugad", fee: "₱25" },
  { barangay: "Iba", fee: "₱25" },
  { barangay: "Iba-Ibayo", fee: "₱30" },
  { barangay: "Tibaguin", fee: "₱30" },
];

// Barangay names only — handy for <select> options.
export const BARANGAYS = DELIVERY_FEES.map((entry) => entry.barangay);

// Numeric fee for totals. "FREE" (Santo Niño) and unknown barangays cost 0.
export const getDeliveryFee = (barangay) => {
  const entry = DELIVERY_FEES.find(
    (candidate) => candidate.barangay === barangay,
  );
  if (!entry || entry.fee === "FREE") return 0;
  return Number(String(entry.fee).replace("₱", "")) || 0;
};