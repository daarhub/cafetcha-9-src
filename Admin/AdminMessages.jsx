import { Mail, MessageSquare, Search, Trash2 } from "lucide-react";
import { useState } from "react";
import AdminSidebar from "./AdminSidebar";
import AdminConfirmDialog from "./AdminConfirmDialog";
import { notify } from "../Customer/toastStore";
import {
  deleteContactMessage,
  getContactMessages,
  markContactMessageRead,
  useCustomerStore,
} from "../Customer/customerStore";
import "./AdminMessages.css";

const SUBJECTS = [
  "Order Concern",
  "Payment Concern",
  "Delivery Concern",
  "Complaint",
  "Suggestion",
  "Be a supplier",
  "Business Partnership",
  "OJT / Internship",
  "Event / Catering Inquiry",
  "Student's Capstone",
];

function AdminMessages() {
  useCustomerStore();
  const [query, setQuery] = useState("");
  const [category, setCategory] = useState("All categories");
  const [confirmDelete, setConfirmDelete] = useState(null);
  const normalized = query.trim().toLowerCase();
  const messages = getContactMessages();
  const visible = messages.filter((message) => {
    const text = [message.firstName, message.lastName, message.email, message.subject, message.message]
      .filter(Boolean)
      .join(" ")
      .toLowerCase();
    return (
      (category === "All categories" || message.subject === category) &&
      (!normalized || text.includes(normalized))
    );
  });
  const unread = messages.filter((message) => !message.read).length;

  const toggleRead = (message) => {
    const nextRead = !message.read;
    const result = markContactMessageRead(message.id, nextRead);
    notify(
      result.ok
        ? `Message marked as ${nextRead ? "read" : "unread"}.`
        : result.error,
      result.ok ? "success" : "error",
    );
  };
  const removeMessage = () => {
    if (!confirmDelete) return;
    const result = deleteContactMessage(confirmDelete.id);
    notify(
      result.ok ? "Message deleted." : result.error,
      result.ok ? "success" : "error",
    );
    setConfirmDelete(null);
  };

  return (
    <>
      <AdminSidebar />
      <main className="admin-management-page admin-messages-page">
        <header className="admin-management-header">
          <div>
            <span>ADMIN PANEL / MESSAGES</span>
            <h1>Messages</h1>
            <p>Customer and guest messages submitted through Contact Us.</p>
          </div>
          <MessageSquare size={32} />
        </header>
        <section className="admin-management-summary">
          <article><span>Total messages</span><strong>{messages.length}</strong><small>All contact submissions</small></article>
          <article><span>Unread</span><strong>{unread}</strong><small>Waiting for review</small></article>
          <article><span>Categories</span><strong>{new Set(messages.map((message) => message.subject).filter(Boolean)).size}</strong><small>Concern types received</small></article>
        </section>
        <section className="admin-management-panel">
          <div className="admin-management-toolbar admin-messages-filters">
            <label><Search size={16} /><input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search name, email, or message" /></label>
            <select value={category} onChange={(event) => setCategory(event.target.value)} aria-label="Filter messages by category">
              <option>All categories</option>
              {SUBJECTS.map((subject) => <option key={subject}>{subject}</option>)}
            </select>
          </div>
          <div className="admin-messages-list">
            {visible.map((message) => (
              <article className={`admin-message-card${message.read ? "" : " unread"}`} key={message.id}>
                <header className="admin-message-card-head">
                  <div><strong>{message.firstName} {message.lastName}</strong><span><Mail size={13} />{message.email} {message.phone ? `· ${message.phone}` : ""}</span></div>
                  <div className="admin-message-card-meta">
                    <span className={`admin-message-status ${message.read ? "read" : "new"}`}>{message.read ? "Read" : "Unread"}</span>
                    <time>{new Date(message.createdAt).toLocaleString()}</time>
                  </div>
                </header>
                <span className="admin-message-subject">{message.subject || "General"}</span>
                <p className="admin-message-text">{message.message}</p>
                <div className="admin-message-actions">
                  <button type="button" onClick={() => toggleRead(message)}>
                    {message.read ? "Mark unread" : "Mark read"}
                  </button>
                  <button type="button" className="danger" onClick={() => setConfirmDelete(message)}><Trash2 size={14} /> Delete</button>
                </div>
              </article>
            ))}
          </div>
          {!visible.length && <p className="admin-empty">No messages matched your filters.</p>}
        </section>
      </main>
      {confirmDelete && <AdminConfirmDialog title="Delete this message?" message={`The message from ${confirmDelete.firstName} ${confirmDelete.lastName} will be permanently removed.`} confirmLabel="Yes, delete" icon={Trash2} onCancel={() => setConfirmDelete(null)} onConfirm={removeMessage} />}
    </>
  );
}

export default AdminMessages;
