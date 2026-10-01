import { useSyncExternalStore } from "react";

const STAFF_KEY = "cafetcha-admin-staff-v3";
const STAFF_SESSION_KEY = "cafetcha-staff-session";

const STAFF_SEED = [
  {
    id: "admin-darwin",
    name: "Darwin C. Mateo",
    role: "Admin",
    email: "darwin.c.mateo@cafetcha.com",
    phone: "",
    image: "/images/PROFILE/darwin-admin.jpg",
    password: "",
    status: "Active",
    isAdminPanel: true,
    createdAt: "2026-01-01T09:00:00.000Z",
  },
  {
    id: "staff-marcel",
    name: "Marcel Grachzelli T. Santos",
    role: "Staff",
    email: "marcel.grachzelli.t.santos@cafetcha.com",
    phone: "",
    image: "/images/PROFILE/marcel-staff.jpg",
    password: "marcel123",
    status: "Active",
    createdAt: "2026-01-02T09:00:00.000Z",
  },
  {
    id: "staff-erica",
    name: "Erica P. Villalon",
    role: "Staff",
    email: "erica.p.villalon@cafetcha.com",
    phone: "",
    image: "/images/PROFILE/erica-staff.jpg",
    password: "erica123",
    status: "Active",
    createdAt: "2026-01-03T09:00:00.000Z",
  },
  {
    id: "staff-raizen",
    name: "Raizen Lheluer P. Perez",
    role: "Delivery Rider",
    email: "raizen.lheluer.p.perez@cafetcha.com",
    phone: "",
    image: "/images/PROFILE/raizen-delivery-rider.jpg",
    password: "",
    status: "Active",
    createdAt: "2026-01-04T09:00:00.000Z",
  },
  {
    id: "staff-john",
    name: "John Roy S. Baluyot",
    role: "Barista",
    email: "john.roy.s.baluyot@cafetcha.com",
    phone: "",
    image: "/images/PROFILE/john-barista.jpg",
    password: "",
    status: "Active",
    createdAt: "2026-01-05T09:00:00.000Z",
  },
  {
    id: "staff-jemelyn",
    name: "Jemelyn C. Eligio",
    role: "Waitress",
    email: "jemelyn.c.eligio@cafetcha.com",
    phone: "",
    image: "/images/PROFILE/jemelyn-waitress.jpg",
    password: "",
    status: "Active",
    createdAt: "2026-01-06T09:00:00.000Z",
  },
];

// Stores a small local admin session so the confirmed Logout action has an
// observable account boundary. Credentials remain in AdminLoginModal; this
// marker only tells the admin shell whether it should show the logged-in
// navigation.
const ADMIN_SESSION_KEY = "cafetcha-admin-session";

const ADMIN_PROFILE_KEY = "cafetcha-admin-profile-v2";
const DEFAULT_ADMIN_PROFILE = {
  name: "Darwin C. Mateo",
  email: "darwin@cafetcha.com",
  password: "darwin123",
  image: "/images/PROFILE/darwin-admin.jpg",
};

const readAdminProfile = () => {
  try {
    const stored = JSON.parse(
      window.localStorage.getItem(ADMIN_PROFILE_KEY) || "{}",
    );
    return {
      ...DEFAULT_ADMIN_PROFILE,
      ...stored,
      image: stored.image?.includes("/member-")
        ? DEFAULT_ADMIN_PROFILE.image
        : stored.image || DEFAULT_ADMIN_PROFILE.image,
    };
  } catch {
    return { ...DEFAULT_ADMIN_PROFILE };
  }
};

export const getAdminProfile = () => {
  const { password, ...safe } = readAdminProfile();
  return safe;
};

export const updateAdminProfile = ({ name, email, image, currentPassword, newPassword }) => {
  const profile = readAdminProfile();
  if (currentPassword !== profile.password) {
    return { ok: false, error: "Enter the current admin password correctly." };
  }
  const nextEmail = String(email || profile.email).trim().toLowerCase();
  if (nextEmail !== profile.email && currentPassword !== profile.password) {
    return { ok: false, error: "Current password verification failed." };
  }
  if (newPassword && newPassword.length < 6) {
    return { ok: false, error: "The new admin password needs at least 6 characters." };
  }
  const next = {
    ...profile,
    name: String(name || profile.name).trim(),
    email: nextEmail,
    image: image || profile.image,
    password: newPassword || profile.password,
  };
  if (!next.name || !next.email) return { ok: false, error: "Name and email are required." };
  try {
    window.localStorage.setItem(ADMIN_PROFILE_KEY, JSON.stringify(next));
  } catch {
    return { ok: false, error: "Admin profile could not be saved." };
  }
  const { password, ...safe } = next;
  return { ok: true, profile: safe };
};

export const authenticateAdmin = (email, password) => {
  const profile = readAdminProfile();
  if (String(email || "").trim().toLowerCase() !== profile.email || password !== profile.password) {
    return { ok: false };
  }
  return { ok: true, profile: getAdminProfile() };
};

export const getAdminSession = () => {
  try {
    return JSON.parse(window.localStorage.getItem(ADMIN_SESSION_KEY) || "null");
  } catch {
    return null;
  }
};

export const createAdminSession = (email) => {
  const session = { email, startedAt: new Date().toISOString() };
  try {
    window.localStorage.setItem(ADMIN_SESSION_KEY, JSON.stringify(session));
  } catch {
    // The in-memory navigation still works when storage is unavailable.
  }
  return session;
};

export const destroyAdminSession = () => {
  try {
    window.localStorage.removeItem(ADMIN_SESSION_KEY);
  } catch {
    // Ignore unavailable storage.
  }
};

const seed = STAFF_SEED.map((member) => ({ ...member }));

const mergeSeedAccounts = (stored) => {
  const records = Array.isArray(stored) ? stored.map((member) => ({ ...member })) : [];
  const normalize = (value) => String(value || "").trim().toLowerCase();
  // Index by BOTH id and email. Matching on email alone re-created a seeded
  // person as a second record the moment an admin changed their email, which
  // is what produced the duplicate staff cards.
  const byId = new Map(records.map((member) => [member.id, member]));
  const byEmail = new Map(
    records.map((member) => [normalize(member.email), member]),
  );

  STAFF_SEED.forEach((seedMember) => {
    const email = normalize(seedMember.email);
    const existing = byId.get(seedMember.id) || byEmail.get(email);
    if (!existing) {
      const copy = { ...seedMember };
      records.push(copy);
      byEmail.set(email, copy);
      return;
    }

    // Keep the required Admin Panel owner hidden from Staff Management even if
    // an older local record did not have the isAdminPanel flag yet.
    if (seedMember.isAdminPanel) {
      existing.id = seedMember.id;
      existing.name = seedMember.name;
      existing.role = seedMember.role;
      existing.email = seedMember.email;
      existing.image = seedMember.image;
      existing.isAdminPanel = true;
    } else {
      // Older local data may contain the requested login without its seed
      // password. Fill only missing fields so later admin edits are preserved.
      existing.password = existing.password || seedMember.password;
      existing.status = existing.status || seedMember.status;
      if (
        [
          "General Manager",
          "Customer Service Manager",
          "Operations Manager",
          "Finance Manager",
        ].includes(existing.role)
      ) {
        existing.role = seedMember.role;
      }
      const hasLegacyPhoto =
        !existing.image || /\/member-\d+(?:-barista)?\.png$/i.test(existing.image);
      if (hasLegacyPhoto) existing.image = seedMember.image;
    }
  });

  return records;
};

const read = () => {
  try {
    const value = JSON.parse(window.localStorage.getItem(STAFF_KEY) || "null");
    return Array.isArray(value) ? mergeSeedAccounts(value) : seed;
  } catch {
    return seed;
  }
};

let staffMembers = read();
let version = 0;
const listeners = new Set();
const emit = () => {
  version += 1;
  listeners.forEach((listener) => listener());
};

// Keep an already-open Staff Panel in sync when the admin changes an account
// in another browser tab. Disabled/deleted sessions are rejected on refresh.
if (typeof window !== "undefined") {
  window.addEventListener("storage", (event) => {
    if (event.key === STAFF_KEY || event.key === STAFF_SESSION_KEY) {
      staffMembers = read();
      emit();
    }
  });
}
const persist = () => {
  try {
    window.localStorage.setItem(STAFF_KEY, JSON.stringify(staffMembers));
  } catch {
    // Keep the current session usable if storage is unavailable.
  }
};
const cleanAccount = (member) => ({
  id: member.id,
  name: String(member.name || "").trim(),
  role: String(member.role || "").trim(),
  email: String(member.email || "").trim().toLowerCase(),
  phone: String(member.phone || "").trim(),
  image: member.image || "/images/logo.png",
  password: String(member.password || ""),
  status: member.status === "Inactive" ? "Inactive" : "Active",
  isAdminPanel: Boolean(member.isAdminPanel),
  createdAt: member.createdAt || new Date().toISOString(),
});

const clean = (member) => {
  const account = cleanAccount(member);
  return {
    id: account.id,
    name: account.name,
    role: account.role,
    email: account.email,
    phone: account.phone,
    image: account.image,
    status: account.status,
    isAdminPanel: account.isAdminPanel,
    hasPassword: Boolean(account.password),
    createdAt: account.createdAt,
  };
};

const isStaffRole = (role) => String(role || "").trim().toLowerCase() === "staff";
const saveSession = (id) => {
  try {
    if (id) window.localStorage.setItem(STAFF_SESSION_KEY, id);
    else window.localStorage.removeItem(STAFF_SESSION_KEY);
  } catch {
    // The current staff action still works when storage is unavailable.
  }
};

export const getStaffMembers = () => {
  // Collapse any historical duplicate first: a person may appear more than
  // once if an older version saved an edit as a new record. The earliest
  // created record wins and later copies are dropped, so one person is always
  // exactly one card.
  const deduped = [];
  const seen = new Set();
  staffMembers
    .filter(
      (member) =>
        member &&
        !member.isAdminPanel &&
        member.id !== "admin-darwin" &&
        member.email !== "darwin.c.mateo@cafetcha.com",
    )
    .forEach((member) => {
      const identity = (
        member.email ||
        member.name ||
        ""
      )
        .trim()
        .toLowerCase();
      if (!identity || seen.has(identity)) return;
      seen.add(identity);
      deduped.push(clean(member));
    });

  // The five required members always lead, in this exact order. Anything the
  // admin adds afterwards follows them in the order it was created.
  const requiredOrder = ["staff-marcel", "staff-erica", "staff-raizen", "staff-john", "staff-jemelyn"];
  const rank = (member) => {
    const index = requiredOrder.indexOf(member.id);
    return index === -1 ? requiredOrder.length : index;
  };
  return deduped
    .map((member, index) => ({ member, index }))
    .sort((a, b) => {
      const byRank = rank(a.member) - rank(b.member);
      if (byRank !== 0) return byRank;
      // Same slot: seeded members keep their seed order, added staff follow by
      // creation date so a new hire lands right after Jemelyn.
      const aTime = new Date(a.member.createdAt || 0).getTime();
      const bTime = new Date(b.member.createdAt || 0).getTime();
      if (aTime !== bTime) return aTime - bTime;
      return a.index - b.index;
    })
    .map((entry) => entry.member);
};
export const getStaffAccount = (id) => {
  const account = staffMembers.find((member) => member.id === id);
  return account ? cleanAccount(account) : null;
};
export const loginStaff = ({ email, password }) => {
  const normalizedEmail = String(email || "").trim().toLowerCase();
  const account = staffMembers.find((member) => member.email === normalizedEmail);
  if (!account || !isStaffRole(account.role) || account.password !== password) {
    return { ok: false, error: "Incorrect staff email or password." };
  }
  if (account.status === "Inactive") {
    return { ok: false, error: "This staff account is disabled." };
  }
  saveSession(account.id);
  return { ok: true, member: clean(account) };
};
export const getCurrentStaff = () => {
  try {
    const id = window.localStorage.getItem(STAFF_SESSION_KEY);
    if (!id) return null;
    const account = getStaffAccount(id);
    if (!account || account.status === "Inactive" || !isStaffRole(account.role)) {
      saveSession(null);
      return null;
    }
    return clean(account);
  } catch {
    return null;
  }
};
export const logoutStaff = () => saveSession(null);

export const addStaffMember = (member) => {
  const role = String(member.role || "").trim();
  const entry = cleanAccount({
    ...member,
    role,
    id: `staff-${Date.now()}-${Math.floor(Math.random() * 100000)}`,
    password: isStaffRole(role) ? member.password : "",
    createdAt: new Date().toISOString(),
  });
  if (!entry.name || !entry.role || !entry.email) {
    return { ok: false, error: "Name, role, and email are required." };
  }
  if (isStaffRole(entry.role) && entry.password.length < 6) {
    return { ok: false, error: "Staff accounts need a password of at least 6 characters." };
  }
  if (staffMembers.some((entryItem) => entryItem.email === entry.email)) {
    return { ok: false, error: "A staff member already uses that email." };
  }
  staffMembers = [entry, ...staffMembers];
  persist();
  emit();
  return { ok: true, member: clean(entry) };
};

export const updateStaffMember = (id, changes) => {
  const current = staffMembers.find((member) => member.id === id);
  if (!current) return { ok: false, error: "Staff member not found." };
  if (current.isAdminPanel) {
    return { ok: false, error: "The Admin Panel profile cannot be edited here." };
  }
  const nextRole = String(changes.role ?? current.role).trim();
  const nextStatus = changes.status === "Active" || changes.status === "Inactive"
    ? changes.status
    : current.status;
  const hasProfileChange = ["name", "role", "email", "phone", "image"].some(
    (key) => Object.prototype.hasOwnProperty.call(changes, key),
  );
  const requestedPassword = String(changes.newPassword || "");
  const hadStaffRole = isStaffRole(current.role);
  const willHaveStaffRole = isStaffRole(nextRole);
  if ((hadStaffRole || willHaveStaffRole) && (hasProfileChange || requestedPassword)) {
    if (current.password && changes.currentPassword !== current.password) {
      return { ok: false, error: "Enter the staff member's current password correctly." };
    }
    if (willHaveStaffRole && !current.password && !requestedPassword) {
      return { ok: false, error: "Set a password before saving this staff account." };
    }
  }
  // Editing keeps the member's identity: the id and created date are never
  // taken from the submitted form, so saving can never create a second record
  // for the same person.
  const next = cleanAccount({
    ...current,
    ...changes,
    id: current.id,
    role: nextRole,
    status: nextStatus,
    password: isStaffRole(nextRole)
      ? requestedPassword || current.password
      : "",
    createdAt: current.createdAt,
  });
  if (!next.name || !next.role || !next.email) {
    return { ok: false, error: "Name, role, and email are required." };
  }
  if (isStaffRole(next.role) && next.password.length < 6) {
    return { ok: false, error: "Staff accounts need a password of at least 6 characters." };
  }
  if (staffMembers.some((member) => member.id !== id && member.email === next.email)) {
    return { ok: false, error: "A staff member already uses that email." };
  }
  // Replace in place by id. Any extra copy already carrying the same id is
  // collapsed, so a repeated save can never duplicate the account.
  const merged = [];
  staffMembers.forEach((member) => {
    if (member.id === id) {
      if (!merged.some((entry) => entry.id === id)) merged.push(next);
      return;
    }
    merged.push(member);
  });
  if (!merged.some((entry) => entry.id === id)) merged.unshift(next);
  staffMembers = merged;
  if (next.status === "Inactive") {
    try {
      if (window.localStorage.getItem(STAFF_SESSION_KEY) === id) saveSession(null);
    } catch {
      // Ignore unavailable storage.
    }
  }
  persist();
  emit();
  return { ok: true, member: clean(next) };
};

export const setStaffMemberStatus = (id, status) => {
  if (status !== "Active" && status !== "Inactive") {
    return { ok: false, error: "Choose a valid staff account status." };
  }
  const current = staffMembers.find((member) => member.id === id);
  if (!current) return { ok: false, error: "Staff member not found." };
  if (current.isAdminPanel) {
    return { ok: false, error: "The Admin Panel profile cannot be edited here." };
  }
  if (current.status === status) return { ok: true, member: clean(current) };

  const next = cleanAccount({ ...current, status });
  staffMembers = staffMembers.map((member) =>
    member.id === id ? next : member,
  );
  if (status === "Inactive") {
    try {
      if (window.localStorage.getItem(STAFF_SESSION_KEY) === id) {
        saveSession(null);
      }
    } catch {
      // Ignore unavailable storage.
    }
  }
  persist();
  emit();
  return { ok: true, member: clean(next) };
};

export const deleteStaffMember = (id) => {
  const target = staffMembers.find((member) => member.id === id);
  if (target?.isAdminPanel) {
    return { ok: false, error: "The Admin Panel profile cannot be deleted." };
  }
  const before = staffMembers.length;
  staffMembers = staffMembers.filter((member) => member.id !== id);
  if (staffMembers.length === before) return { ok: false, error: "Staff member not found." };
  try {
    if (window.localStorage.getItem(STAFF_SESSION_KEY) === id) saveSession(null);
  } catch {
    // Ignore unavailable storage.
  }
  persist();
  emit();
  return { ok: true };
};

export const useAdminManagement = () => {
  useSyncExternalStore(
    (listener) => {
      listeners.add(listener);
      return () => listeners.delete(listener);
    },
    () => version,
    () => version,
  );
  return getStaffMembers();
};
