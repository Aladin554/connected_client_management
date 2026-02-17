import { useEffect, useState } from "react";
import { Plus, Save, ShieldCheck, X } from "lucide-react";
import { toast } from "react-toastify";
import api from "../../api/axios";
import { getMeCached } from "../../utils/me";

interface Me {
  role_id: number;
}

const isLikelyIp = (value: string): boolean => {
  const ipv4 =
    /^(?:(?:25[0-5]|2[0-4]\d|1\d\d|[1-9]?\d)\.){3}(?:25[0-5]|2[0-4]\d|1\d\d|[1-9]?\d)$/;
  const ipv6 = /^[0-9A-Fa-f:]+$/;
  return ipv4.test(value) || (value.includes(":") && ipv6.test(value));
};

export default function IpAccessControl() {
  const [me, setMe] = useState<Me | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const [allowedIps, setAllowedIps] = useState<string[]>([]);
  const [ipInput, setIpInput] = useState("");

  const isSuperAdmin = (me?.role_id ?? 0) === 1;

  useEffect(() => {
    const boot = async () => {
      try {
        const profile = (await getMeCached()) as Me;
        setMe(profile);

        if (profile.role_id !== 1) {
          return;
        }

        const res = await api.get("/ip-access/config");
        const ips = Array.isArray(res.data?.allowed_ips) ? res.data.allowed_ips : [];
        setAllowedIps(ips.filter(Boolean));
      } catch (error: any) {
        toast.error(error?.response?.data?.message || "Failed to load IP access config");
      } finally {
        setLoading(false);
      }
    };

    void boot();
  }, []);

  const addIp = () => {
    const raw = ipInput.trim();
    if (!raw) return;

    if (!isLikelyIp(raw)) {
      toast.error("Please enter a valid IP address");
      return;
    }

    setAllowedIps((prev) => (prev.includes(raw) ? prev : [...prev, raw]));
    setIpInput("");
  };

  const removeIp = (ip: string) => {
    setAllowedIps((prev) => prev.filter((value) => value !== ip));
  };

  const save = async () => {
    if (allowedIps.length === 0) {
      toast.error("At least one IP is required");
      return;
    }

    setSaving(true);
    try {
      const res = await api.patch("/ip-access/config", {
        allowed_ips: allowedIps,
      });
      const serverIps = Array.isArray(res.data?.allowed_ips) ? res.data.allowed_ips : allowedIps;
      setAllowedIps(serverIps);
      toast.success("IP access updated for all roles 2, 3 and 4");
    } catch (error: any) {
      toast.error(error?.response?.data?.message || "Failed to update IP access");
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return <div className="p-6 text-gray-500">Loading IP access settings...</div>;
  }

  if (!isSuperAdmin) {
    return (
      <div className="rounded-xl border border-red-200 bg-red-50 p-6 text-red-700">
        Only superadmin can manage IP access.
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="rounded-2xl border border-gray-200 bg-white p-5">
        <div className="flex items-center gap-2 text-gray-900">
          <ShieldCheck size={18} />
          <h1 className="text-xl font-semibold">IP Access Control</h1>
        </div>
        <p className="mt-1 text-sm text-gray-600">
          Single global IP allowlist for all users.
        </p>
      </div>

      <div className="rounded-2xl border border-gray-200 bg-white p-5">
        <label className="mb-2 block text-sm font-medium text-gray-700">
          Allowed IPs
        </label>

        <div className="flex flex-wrap items-center gap-2">
          {allowedIps.map((ip) => (
            <span
              key={ip}
              className="inline-flex items-center gap-1 rounded-md bg-blue-50 px-2 py-1 text-xs font-medium text-blue-800"
            >
              {ip}
              <button
                type="button"
                onClick={() => removeIp(ip)}
                className="text-blue-700 hover:text-blue-900"
              >
                <X size={12} />
              </button>
            </span>
          ))}
        </div>

        <div className="mt-3 flex flex-wrap items-center gap-2">
          <input
            value={ipInput}
            onChange={(e) => setIpInput(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                e.preventDefault();
                addIp();
              }
            }}
            placeholder="Add IP address"
            className="h-10 min-w-[280px] flex-1 rounded-lg border border-gray-300 px-3 text-sm focus:border-blue-500 focus:outline-none"
          />
          <button
            type="button"
            onClick={addIp}
            className="inline-flex h-10 items-center gap-1 rounded-lg border border-gray-300 px-3 text-sm font-medium text-gray-700 hover:bg-gray-50"
          >
            <Plus size={14} />
            Add
          </button>
          <button
            type="button"
            onClick={() => void save()}
            disabled={saving}
            className="inline-flex h-10 items-center gap-1 rounded-lg bg-blue-600 px-3 text-sm font-medium text-white hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-60"
          >
            <Save size={14} />
            {saving ? "Saving..." : "Save"}
          </button>
        </div>
      </div>
    </div>
  );
}

