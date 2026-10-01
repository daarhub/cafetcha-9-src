import { Building2, Clock, Mail, Save, Store, UserRound } from "lucide-react";
import { useEffect, useState } from "react";
import AdminSidebar from "./AdminSidebar";
import { notify } from "../Customer/toastStore";
import {
  createAdminSession,
  getAdminProfile,
  updateAdminProfile,
} from "./adminManagementStore";
import "./AdminSettings.css";

const SETTINGS_KEY = "cafetcha-admin-settings";
const DEFAULT_SETTINGS = {
  businessName: "Cafétcha",
  email: "cafetcha.official@gmail.com",
  phone: "0910 182 1406",
  address: "Sto. Niño, Hagonoy, Bulacan",
  openingHours: "3:00 PM – 11:00 PM",
};

const readSettings = () => {
  try {
    return { ...DEFAULT_SETTINGS, ...JSON.parse(window.localStorage.getItem(SETTINGS_KEY) || "{}") };
  } catch {
    return DEFAULT_SETTINGS;
  }
};

function AdminSettings() {
  const [profile, setProfile] = useState(getAdminProfile);
  const [profileError, setProfileError] = useState("");
  const [passwords, setPasswords] = useState({ currentPassword: "", newPassword: "", confirmPassword: "" });
  const [settings, setSettings] = useState(readSettings);

  useEffect(() => {
    setProfile(getAdminProfile());
    setSettings(readSettings());
  }, []);

  const saveProfile = (event) => {
    event.preventDefault();
    if (passwords.newPassword && passwords.newPassword !== passwords.confirmPassword) {
      setProfileError("The new passwords do not match.");
      return;
    }
    const result = updateAdminProfile({ ...profile, ...passwords });
    if (!result.ok) {
      setProfileError(result.error);
      return;
    }
    createAdminSession(result.profile.email);
    setProfile(result.profile);
    setPasswords({ currentPassword: "", newPassword: "", confirmPassword: "" });
    setProfileError("");
    notify("Admin profile and password updated.");
  };

  const update = (key, value) => setSettings((current) => ({ ...current, [key]: value }));
  const save = (event) => {
    event.preventDefault();
    try {
      window.localStorage.setItem(SETTINGS_KEY, JSON.stringify(settings));
      notify("Admin settings saved.");
    } catch {
      notify("Settings could not be saved in this browser.", "error");
    }
  };
  const reset = () => {
    setSettings(DEFAULT_SETTINGS);
    try { window.localStorage.removeItem(SETTINGS_KEY); } catch { /* keep UI usable */ }
    notify("Settings restored to defaults.", "info");
  };

  return (
    <>
      <AdminSidebar />
      <main className="admin-management-page admin-settings-page">
        <header className="admin-management-header">
          <div>
            <span>ADMIN PANEL / SETTINGS</span>
            <h1>Settings</h1>
            <p>Manage the admin profile and Cafétcha business information.</p>
          </div>
          <Store size={32} />
        </header>

        <form className="admin-settings-grid" onSubmit={save}>
          <section className="admin-management-panel admin-settings-card">
            <header>
              <Building2 size={21} />
              <div>
                <h2>Business information</h2>
                <p>Details used across the customer site.</p>
              </div>
            </header>
            <label>
              Business name
              <input
                value={settings.businessName}
                onChange={(event) => update("businessName", event.target.value)}
              />
            </label>
            <label className="admin-settings-field">
              <Mail size={14} /> Contact email
              <input
                type="email"
                value={settings.email}
                onChange={(event) => update("email", event.target.value)}
              />
            </label>
            <label className="admin-settings-field">
              <UserRound size={14} /> Contact phone
              <input
                value={settings.phone}
                onChange={(event) => update("phone", event.target.value)}
              />
            </label>
            <label className="admin-settings-field">
              <Store size={14} /> Address
              <input
                value={settings.address}
                onChange={(event) => update("address", event.target.value)}
              />
            </label>
            <label className="admin-settings-field">
              <Clock size={14} /> Opening hours
              <input
                value={settings.openingHours}
                onChange={(event) => update("openingHours", event.target.value)}
              />
            </label>
            <div className="admin-settings-actions">
              <button type="submit" className="admin-primary-button">
                <Save size={16} /> Save settings
              </button>
              <button
                type="button"
                className="admin-secondary-button"
                onClick={reset}
              >
                Restore defaults
              </button>
            </div>
          </section>
        </form>

        <form className="admin-settings-admin-profile" onSubmit={saveProfile}>
          <section className="admin-management-panel admin-settings-card">
            <header>
              <UserRound size={21} />
              <div>
                <h2>Admin information</h2>
                <p>Profile shown at the top of the Admin Panel.</p>
              </div>
            </header>
            <label>
              Name
              <input
                value={profile.name}
                onChange={(event) =>
                  setProfile((current) => ({ ...current, name: event.target.value }))
                }
              />
            </label>
            <label className="admin-settings-field">
              <Mail size={14} /> Email address
              <input
                type="email"
                value={profile.email}
                onChange={(event) =>
                  setProfile((current) => ({ ...current, email: event.target.value }))
                }
              />
            </label>
            <label>
              Current password
              <input
                type="password"
                autoComplete="current-password"
                value={passwords.currentPassword}
                onChange={(event) =>
                  setPasswords((current) => ({
                    ...current,
                    currentPassword: event.target.value,
                  }))
                }
              />
            </label>
            <label>
              New password (optional)
              <input
                type="password"
                autoComplete="new-password"
                value={passwords.newPassword}
                onChange={(event) =>
                  setPasswords((current) => ({
                    ...current,
                    newPassword: event.target.value,
                  }))
                }
              />
            </label>
            <label>
              Confirm new password
              <input
                type="password"
                autoComplete="new-password"
                value={passwords.confirmPassword}
                onChange={(event) =>
                  setPasswords((current) => ({
                    ...current,
                    confirmPassword: event.target.value,
                  }))
                }
              />
            </label>
            {profileError && <p className="admin-form-error">{profileError}</p>}
            <div className="admin-settings-actions">
              <button className="admin-primary-button">
                <Save size={16} /> Save admin profile
              </button>
            </div>
          </section>
        </form>
      </main>
    </>
  );
}

export default AdminSettings;
