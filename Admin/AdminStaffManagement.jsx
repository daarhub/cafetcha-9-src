import {
  ImagePlus,
  Pencil,
  Plus,
  Search,
  Trash2,
  UserCheck,
  UserX,
  X,
} from "lucide-react";
import { useState } from "react";
import { createPortal } from "react-dom";
import AdminSidebar from "./AdminSidebar";
import AdminConfirmDialog from "./AdminConfirmDialog";
import { notify } from "../Customer/toastStore";
import {
  addStaffMember,
  deleteStaffMember,
  setStaffMemberStatus,
  updateStaffMember,
  useAdminManagement,
} from "./adminManagementStore";
import "./AdminStaffManagement.css";

const EMPTY = {
  name: "",
  role: "Staff",
  email: "",
  phone: "",
  image: "/images/logo.png",
  status: "Active",
  password: "",
  currentPassword: "",
  newPassword: "",
  confirmPassword: "",
};

const isExactStaffRole = (role) =>
  String(role || "")
    .trim()
    .toLowerCase() === "staff";

function AdminStaffManagement() {
  const staff = useAdminManagement().filter(Boolean);
  const [query, setQuery] = useState("");
  const [status, setStatus] = useState("All status");
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState(EMPTY);
  const [error, setError] = useState("");
  const [pendingSave, setPendingSave] = useState(null);
  const [pendingStatus, setPendingStatus] = useState(null);
  const [confirmDelete, setConfirmDelete] = useState(null);
  const normalized = query.trim().toLowerCase();
  const visible = staff.filter((member) => {
    const text = `${member.name} ${member.role} ${member.email}`.toLowerCase();
    return (
      text.includes(normalized) &&
      (status === "All status" ||
        (status === "Active"
          ? member.status === "Active"
          : status === "Disabled" && member.status === "Inactive"))
    );
  });
  const isStaffRole = isExactStaffRole(form.role);
  const editingMember =
    editing && editing !== "new"
      ? staff.find((member) => member.id === editing)
      : null;
  const usesStaffCredentials =
    isStaffRole || isExactStaffRole(editingMember?.role);

  const openAdd = () => {
    setEditing("new");
    setForm(EMPTY);
    setError("");
  };
  const openEdit = (member) => {
    setEditing(member.id);
    setForm({
      ...EMPTY,
      ...member,
      password: "",
      currentPassword: "",
      newPassword: "",
      confirmPassword: "",
    });
    setError("");
  };
  const closeForm = () => {
    setEditing(null);
    setError("");
  };
  const requestSave = (event) => {
    event.preventDefault();
    if (!form.name.trim() || !form.role.trim() || !form.email.trim()) {
      setError("Name, role, and email are required.");
      return;
    }
    if (isStaffRole && editing === "new" && form.password.length < 6) {
      setError("Staff accounts need a password of at least 6 characters.");
      return;
    }
    if (usesStaffCredentials && editing !== "new" && form.hasPassword) {
      if (!form.currentPassword) {
        setError("Enter the staff member's current password to save changes.");
        return;
      }
    } else if (
      isStaffRole &&
      editing !== "new" &&
      !form.hasPassword &&
      !form.newPassword
    ) {
      setError("Set a Staff Panel password for this Staff account.");
      return;
    }
    if (form.newPassword && form.newPassword.length < 6) {
      setError("The new password must have at least 6 characters.");
      return;
    }
    if (form.newPassword && form.newPassword !== form.confirmPassword) {
      setError("The new passwords do not match.");
      return;
    }
    setError("");
    setPendingSave({ ...form });
  };
  const confirmSave = () => {
    if (!pendingSave) return;
    const values = pendingSave;
    const result =
      editing === "new"
        ? addStaffMember({
            ...values,
            password: values.password,
          })
        : updateStaffMember(editing, values);
    if (!result.ok) {
      setError(result.error);
      setPendingSave(null);
      return;
    }
    notify(`${values.name} was ${editing === "new" ? "added" : "updated"}.`);
    setPendingSave(null);
    closeForm();
  };
  const pendingStatusMember =
    pendingStatus && pendingStatus.member && pendingStatus.member.id
      ? pendingStatus.member
      : pendingStatus && pendingStatus.id
        ? pendingStatus
        : null;
  const pendingStatusValue =
    pendingStatusMember && pendingStatusMember.status === "Inactive"
      ? "Inactive"
      : "Active";
  const openStatusChange = (member) => {
    if (!member || !member.id) return;
    const current = staff.find((entry) => entry.id === member.id);
    if (!current || !current.id) return;
    setPendingStatus({
      member: {
        ...current,
        status: current.status === "Inactive" ? "Inactive" : "Active",
      },
    });
  };
  const confirmStatusChange = () => {
    const id = pendingStatusMember && pendingStatusMember.id;
    const current = id ? staff.find((entry) => entry.id === id) : null;
    if (!current || !current.id) {
      setPendingStatus(null);
      return;
    }
    const currentStatus =
      current.status === "Inactive" ? "Inactive" : "Active";
    const nextStatus = currentStatus === "Active" ? "Inactive" : "Active";
    const result = setStaffMemberStatus(current.id, nextStatus);
    notify(
      result.ok
        ? `${current.name} is now ${nextStatus === "Inactive" ? "disabled" : "active"}.`
        : result.error || "The staff account could not be updated.",
      result.ok ? "success" : "error",
    );
    setPendingStatus(null);
  };
  const remove = () => {
    if (!confirmDelete) return;
    const result = deleteStaffMember(confirmDelete.id);
    notify(
      result.ok
        ? `${confirmDelete.name} was deleted from Staff Management.`
        : result.error,
      result.ok ? "info" : "error",
    );
    setConfirmDelete(null);
  };
  const readImage = (event) => {
    const file = event.target.files?.[0];
    if (!file) return;
    if (!file.type.startsWith("image/")) {
      notify("Please choose an image file.", "error");
      return;
    }
    if (file.size > 2 * 1024 * 1024) {
      notify("Please choose an image smaller than 2 MB.", "error");
      return;
    }
    const reader = new FileReader();
    reader.onload = () => {
      setForm((current) => ({ ...current, image: reader.result }));
      notify("Staff photo selected. Save the account to publish it.", "info");
    };
    reader.readAsDataURL(file);
  };

  return (
    <>
      <AdminSidebar />
      <main className="admin-management-page admin-staff-management-page">
        <header className="admin-management-header">
          <div>
            <span>ADMIN PANEL</span>
            <h1>Staff Management</h1>
            <p>
              Create staff logins, update profiles and passwords, and control
              access.
            </p>
          </div>
          <button
            className="admin-primary-button"
            type="button"
            onClick={openAdd}
          >
            <Plus size={16} /> Add Staff
          </button>
        </header>

        <section className="admin-management-summary">
          <article>
            <span>Team members</span>
            <strong>{staff.length}</strong>
            <small>Excluding the Admin Panel owner</small>
          </article>
          <article>
            <span>Active</span>
            <strong>
              {staff.filter((member) => member.status === "Active").length}
            </strong>
            <small>Can sign in to Staff Panel</small>
          </article>
          <article>
            <span>Disabled</span>
            <strong>
              {staff.filter((member) => member.status === "Inactive").length}
            </strong>
            <small>Login access is blocked</small>
          </article>
        </section>

        <section className="admin-management-panel">
          <div className="admin-management-toolbar">
            <label>
              <Search size={16} />
              <input
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                placeholder="Search staff name, role, or email"
              />
            </label>
            <select
              value={status}
              onChange={(event) => setStatus(event.target.value)}
            >
              <option>All status</option>
              <option>Active</option>
              <option value="Disabled">Disabled</option>
            </select>
          </div>
          <div className="admin-people-list">
            {visible.map((member) => (
              <article
                key={member.id}
                className={member.status === "Inactive" ? "is-disabled" : ""}
              >
                <div className="admin-staff-photo">
                  <img src={member.image} alt={member.name} />
                </div>
                <div className="admin-staff-copy">
                  <strong>{member.name}</strong>
                  <span>{member.role}</span>
                  <small>
                    {member.email}
                    {member.phone ? ` · ${member.phone}` : ""}
                  </small>
                </div>
                <div className="admin-staff-card-controls">
                  <span
                    className={`admin-status-pill ${member.status === "Active" ? "available" : "disabled"}`}
                  >
                    {member.status === "Active" ? "Active" : "Disabled"}
                  </span>
                  <div className="admin-menu-actions">
                    <button
                    type="button"
                    onClick={() => openStatusChange(member)}
                      title={
                        member.status === "Active"
                          ? "Disable staff account"
                          : "Enable staff account"
                      }
                    >
                      {member.status === "Active" ? (
                        <UserX size={20} />
                      ) : (
                        <UserCheck size={20} />
                      )}
                    </button>
                    <button
                      type="button"
                      onClick={() => openEdit(member)}
                      title="Edit staff"
                    >
                      <Pencil size={20} />
                    </button>
                    <button
                      className="danger"
                      type="button"
                      onClick={() => setConfirmDelete(member)}
                      title="Delete staff"
                    >
                      <Trash2 size={20} />
                    </button>
                  </div>
                </div>
              </article>
            ))}
          </div>
          {!visible.length && (
            <p className="admin-empty">
              No staff accounts matched your search.
            </p>
          )}
        </section>
      </main>

      {editing &&
        createPortal(
          <div
            className="admin-modal-backdrop"
            role="presentation"
            onClick={closeForm}
          >
            <form
              className="admin-form-modal admin-staff-form"
              onSubmit={requestSave}
              onClick={(event) => event.stopPropagation()}
            >
              <button
                type="button"
                className="admin-modal-close"
                onClick={closeForm}
                aria-label="Close"
              >
                <X size={18} />
              </button>
              <h2>
                {editing === "new" ? "Add Staff Account" : `Edit ${form.name}`}
              </h2>
              <div className="admin-form-grid">
                <label>
                  Name
                  <input
                    value={form.name}
                    onChange={(event) =>
                      setForm({ ...form, name: event.target.value })
                    }
                  />
                </label>
                <label>
                  Role
                  <input
                    type="text"
                    value={form.role}
                    onChange={(event) =>
                      setForm({ ...form, role: event.target.value })
                    }
                    placeholder="Type a role, e.g. Staff"
                  />
                </label>
                <label>
                  Email
                  <input
                    type="email"
                    value={form.email}
                    onChange={(event) =>
                      setForm({ ...form, email: event.target.value })
                    }
                  />
                </label>
                <label>
                  Phone
                  <input
                    value={form.phone}
                    onChange={(event) =>
                      setForm({ ...form, phone: event.target.value })
                    }
                  />
                </label>
                <label className="wide">
                  Image URL
                  <input
                    value={form.image}
                    onChange={(event) =>
                      setForm({ ...form, image: event.target.value })
                    }
                  />
                </label>
                <label className="admin-file-upload wide">
                  <ImagePlus size={18} />
                  <span>
                    Select staff photo
                    <input type="file" accept="image/*" onChange={readImage} />
                  </span>
                </label>
                {isStaffRole && editing === "new" && (
                  <label className="wide">
                    Staff password
                    <input
                      type="password"
                      autoComplete="new-password"
                      value={form.password}
                      onChange={(event) =>
                        setForm({ ...form, password: event.target.value })
                      }
                      placeholder="Minimum 6 characters"
                    />
                  </label>
                )}
                {usesStaffCredentials && editing !== "new" && (
                  <>
                    <label className="wide">
                      Current staff password
                      <input
                        type="password"
                        autoComplete="current-password"
                        value={form.currentPassword}
                        onChange={(event) =>
                          setForm({
                            ...form,
                            currentPassword: event.target.value,
                          })
                        }
                        placeholder="Required to save this Staff account"
                      />
                    </label>
                    <label>
                      Change password (optional)
                      <input
                        type="password"
                        autoComplete="new-password"
                        value={form.newPassword}
                        onChange={(event) =>
                          setForm({ ...form, newPassword: event.target.value })
                        }
                      />
                    </label>
                    <label>
                      Confirm new password
                      <input
                        type="password"
                        autoComplete="new-password"
                        value={form.confirmPassword}
                        onChange={(event) =>
                          setForm({
                            ...form,
                            confirmPassword: event.target.value,
                          })
                        }
                      />
                    </label>
                  </>
                )}
              </div>
              {error && <p className="admin-form-error">{error}</p>}
              <div className="admin-form-actions">
                <button type="button" onClick={closeForm}>
                  Cancel
                </button>
                <button className="admin-primary-button">
                  {editing === "new" ? "Review & add" : "Review changes"}
                </button>
              </div>
            </form>
          </div>,
          document.body,
        )}

      {pendingSave && (
        <AdminConfirmDialog
          title={
            editing === "new"
              ? "Create this staff account?"
              : "Save this staff account?"
          }
          message={`${pendingSave.name} will be saved with the ${pendingSave.role} role${isStaffRole ? " and a Staff Panel login password" : ""}.`}
          confirmLabel={
            editing === "new" ? "Yes, create account" : "Yes, save changes"
          }
          variant="success"
          onCancel={() => setPendingSave(null)}
          onConfirm={confirmSave}
        />
      )}
      {pendingStatusMember && (
        <AdminConfirmDialog
          title={
            pendingStatusValue === "Active"
              ? "Disable this staff account?"
              : "Enable this staff account?"
          }
          message={`${pendingStatusMember.name} will be ${pendingStatusValue === "Active" ? "logged out and blocked from signing in to the Staff Panel" : "allowed to sign in again"}.`}
          confirmLabel={
            pendingStatusValue === "Active" ? "Yes, disable" : "Yes, enable"
          }
          variant={pendingStatusValue === "Active" ? "danger" : "success"}
          icon={pendingStatusValue === "Active" ? UserX : UserCheck}
          onCancel={() => setPendingStatus(null)}
          onConfirm={confirmStatusChange}
        />
      )}
      {confirmDelete && (
        <AdminConfirmDialog
          title="Delete this staff account?"
          message={`${confirmDelete.name} will be removed from Staff Management. Any active session will be signed out.`}
          confirmLabel="Yes, delete"
          icon={Trash2}
          onCancel={() => setConfirmDelete(null)}
          onConfirm={remove}
        />
      )}
    </>
  );
}

export default AdminStaffManagement;
