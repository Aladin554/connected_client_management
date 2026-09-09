import { useEffect, useState } from "react";
import api from "../../../api/axios";
import { toast, ToastContainer } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";

interface DriveSettingsForm {
  oauth_enabled: boolean;
}

const DEFAULT_FORM: DriveSettingsForm = {
  oauth_enabled: false,
};

const applySettingsResponse = (data: any): DriveSettingsForm => ({
  oauth_enabled: Boolean(data?.oauth_enabled),
});

export default function GoogleDriveSettings() {
  const [form, setForm] = useState<DriveSettingsForm>(DEFAULT_FORM);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [oauthConnectedEmail, setOauthConnectedEmail] = useState<string | null>(null);
  const [connecting, setConnecting] = useState(false);
  const [disconnecting, setDisconnecting] = useState(false);

  const fetchSettings = async () => {
    setLoading(true);
    setLoadError(null);
    try {
      const res = await api.get("/google-drive-settings");
      setForm(applySettingsResponse(res.data));
      setOauthConnectedEmail(res.data?.oauth_connected_email || null);
    } catch (err: any) {
      console.error("Failed to load Google Drive settings:", err);
      setLoadError(
        err?.response?.status === 403
          ? "Only superadmin can view Google Drive settings."
          : "Could not load Google Drive settings."
      );
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSettings();

    // Returning from the Google OAuth consent redirect - the callback lands
    // back here with ?oauth=success|error, since it can't hand the result
    // back via a normal AJAX response (it's a full browser redirect).
    const params = new URLSearchParams(window.location.search);
    const oauthResult = params.get("oauth");
    if (oauthResult === "success") {
      toast.success("Google account connected.");
      fetchSettings();
    } else if (oauthResult === "error") {
      toast.error(params.get("reason") || "Could not connect Google account.");
    }
    if (oauthResult) {
      params.delete("oauth");
      params.delete("reason");
      const query = params.toString();
      window.history.replaceState({}, "", window.location.pathname + (query ? `?${query}` : ""));
    }
  }, []);

  const handleSave = async () => {
    setSaving(true);
    try {
      const res = await api.put("/google-drive-settings", form);
      setForm(applySettingsResponse(res.data));
      setOauthConnectedEmail(res.data?.oauth_connected_email || null);
      toast.success("Google Drive settings saved.");
    } catch (err: any) {
      console.error("Failed to save Google Drive settings:", err);
      const apiMessage =
        err?.response?.data?.errors?.oauth_enabled?.[0] || err?.response?.data?.message;
      toast.error(apiMessage || "Could not save Google Drive settings.");
    } finally {
      setSaving(false);
    }
  };

  const handleConnectGoogleAccount = async () => {
    setConnecting(true);
    try {
      const res = await api.get("/google-drive-oauth/connect");
      const url = res.data?.url;
      if (!url) throw new Error("No authorization URL returned");
      // Full top-level navigation - OAuth consent can't happen inside an AJAX call.
      window.location.href = url;
    } catch (err: any) {
      console.error("Failed to start Google OAuth:", err);
      toast.error(err?.response?.data?.message || "Could not start Google account connection.");
      setConnecting(false);
    }
  };

  const handleDisconnectGoogleAccount = async () => {
    if (!window.confirm("Disconnect this Google account? Google Drive integration will be turned off.")) {
      return;
    }
    setDisconnecting(true);
    try {
      const res = await api.post("/google-drive-oauth/disconnect");
      setForm(applySettingsResponse(res.data));
      setOauthConnectedEmail(res.data?.oauth_connected_email || null);
      toast.success("Google account disconnected.");
    } catch (err: any) {
      console.error("Failed to disconnect Google account:", err);
      toast.error(err?.response?.data?.message || "Could not disconnect Google account.");
    } finally {
      setDisconnecting(false);
    }
  };

  if (loading) {
    return (
      <div className="p-16 border border-gray-200 rounded-2xl dark:border-gray-700 dark:bg-gray-900 shadow-sm max-w-4xl mx-auto w-full">
        <div className="text-gray-500 dark:text-gray-400">Loading Google Drive settings...</div>
      </div>
    );
  }

  if (loadError) {
    return (
      <div className="p-16 border border-gray-200 rounded-2xl dark:border-gray-700 dark:bg-gray-900 shadow-sm max-w-4xl mx-auto w-full">
        <div className="text-red-500">{loadError}</div>
      </div>
    );
  }

  return (
    <div className="p-16 border border-gray-200 rounded-2xl dark:border-gray-700 dark:bg-gray-900 shadow-sm max-w-4xl mx-auto w-full relative">
      <ToastContainer position="top-right" autoClose={3000} hideProgressBar theme="colored" />

      <h1 className="text-2xl font-semibold mb-2 dark:text-gray-200">Google Drive Settings</h1>
      <p className="text-sm text-gray-500 dark:text-gray-400 mb-6">
        Controls automatic folder creation and sharing for board cards. Each card gets its own
        Shared Drive, and everyone with access becomes a real member of it - this is what lets
        people add files from a Google Drive folder synced on their own computer. Changes apply
        immediately to new cards; existing cards keep their already-created folder.
      </p>

      <div className="space-y-6">
        <div className="rounded-lg border-2 border-dashed border-gray-300 dark:border-gray-700 p-4">
          <p className="font-medium dark:text-gray-200 mb-4">
            Requires a real Google account to be connected, since Shared Drives can only be
            created by real organization members.
          </p>

          {oauthConnectedEmail ? (
            <div className="flex items-center justify-between gap-3 rounded-md bg-emerald-50 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-900 px-3 py-2 mb-4">
              <div className="text-sm text-emerald-800 dark:text-emerald-300">
                Connected as <span className="font-medium">{oauthConnectedEmail}</span>
              </div>
              <button
                type="button"
                onClick={handleDisconnectGoogleAccount}
                disabled={disconnecting}
                className="text-xs px-3 py-1.5 rounded border border-red-300 dark:border-red-800 text-red-700 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-950/30 disabled:opacity-50 whitespace-nowrap"
              >
                {disconnecting ? "Disconnecting..." : "Disconnect"}
              </button>
            </div>
          ) : (
            <button
              type="button"
              onClick={handleConnectGoogleAccount}
              disabled={connecting}
              className="mb-4 px-4 py-2 rounded-lg border border-gray-300 dark:border-gray-600 text-gray-800 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-gray-800 disabled:opacity-50"
            >
              {connecting ? "Redirecting to Google..." : "Connect Google Account"}
            </button>
          )}

          <div className="flex items-center justify-between rounded-lg border dark:border-gray-700 px-4 py-3">
            <div>
              <p className="font-medium dark:text-gray-200">Enable Google Drive integration</p>
              <p className="text-sm text-gray-500 dark:text-gray-400">
                {oauthConnectedEmail
                  ? "New cards will get their own Shared Drive."
                  : "Connect a Google account above first."}
              </p>
            </div>
            <label className={`relative inline-flex items-center ${oauthConnectedEmail ? "cursor-pointer" : "cursor-not-allowed opacity-50"}`}>
              <input
                type="checkbox"
                checked={form.oauth_enabled}
                disabled={!oauthConnectedEmail}
                onChange={(e) => setForm({ ...form, oauth_enabled: e.target.checked })}
                className="sr-only peer"
              />
              <div className="w-11 h-6 bg-gray-300 rounded-full peer peer-checked:bg-blue-600 transition-colors dark:bg-gray-600" />
              <div className="absolute left-1 top-1 w-4 h-4 bg-white rounded-full transition-transform peer-checked:translate-x-5" />
            </label>
          </div>
        </div>

        <div className="flex justify-end gap-3 mt-8">
          <button
            type="button"
            onClick={handleSave}
            disabled={saving}
            className="px-6 py-3 rounded-lg bg-blue-600 text-white hover:bg-blue-700 text-lg disabled:opacity-50"
          >
            {saving ? "Saving..." : "Save Settings"}
          </button>
        </div>
      </div>
    </div>
  );
}
