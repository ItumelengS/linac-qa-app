"use client";

import { useEffect, useState, useCallback } from "react";
import {
  RadioactiveSource,
  RadionuclideData,
  SourceStatus,
  SourceCategory,
  SourceForm,
  SOURCE_STATUS_LABELS,
  SOURCE_CATEGORY_LABELS,
  SOURCE_FORM_LABELS,
  COMMON_RADIONUCLIDES,
} from "@/types/database";

interface SourceFormData {
  radionuclide: string;
  source_form: SourceForm;
  description: string;
  serial_number: string;
  container_serial: string;
  license_item_number: number | "";
  initial_activity: number | "";
  activity_unit: string;
  calibration_date: string;
  category: SourceCategory;
  room_type: string;
  location_building: string;
  location_floor: string;
  location_room: string;
  location_department: string;
  location_detail: string;
  status: SourceStatus;
  status_notes: string;
  acquired_date: string;
  acquired_from: string;
  notes: string;
}

const initialFormData: SourceFormData = {
  radionuclide: "",
  source_form: "sealed",
  description: "",
  serial_number: "",
  container_serial: "",
  license_item_number: "",
  initial_activity: "",
  activity_unit: "MBq",
  calibration_date: new Date().toISOString().split("T")[0],
  category: "nuclear_medicine",
  room_type: "",
  location_building: "",
  location_floor: "",
  location_room: "",
  location_department: "",
  location_detail: "",
  status: "active",
  status_notes: "",
  acquired_date: "",
  acquired_from: "",
  notes: "",
};

export default function SourcesPage() {
  const [sources, setSources] = useState<RadioactiveSource[]>([]);
  const [radionuclideData, setRadionuclideData] = useState<RadionuclideData[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Filters
  const [statusFilter, setStatusFilter] = useState<SourceStatus | "all">("all");
  const [categoryFilter, setCategoryFilter] = useState<SourceCategory | "all">("all");
  const [searchTerm, setSearchTerm] = useState("");

  // Modal state
  const [showAddModal, setShowAddModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showStatusModal, setShowStatusModal] = useState(false);
  const [selectedSource, setSelectedSource] = useState<RadioactiveSource | null>(null);
  const [formData, setFormData] = useState<SourceFormData>(initialFormData);
  const [saving, setSaving] = useState(false);

  const loadData = useCallback(async () => {
    try {
      setLoading(true);
      const [sourcesRes, radionuclidesRes] = await Promise.all([
        fetch("/api/sources"),
        fetch("/api/sources/radionuclides"),
      ]);

      if (sourcesRes.ok) {
        const data = await sourcesRes.json();
        setSources(data.sources || []);
      }

      if (radionuclidesRes.ok) {
        const data = await radionuclidesRes.json();
        setRadionuclideData(data.radionuclides || []);
      }
    } catch (err) {
      setError("Failed to load data");
      console.error(err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const filteredSources = sources.filter((source) => {
    if (statusFilter !== "all" && source.status !== statusFilter) return false;
    if (categoryFilter !== "all" && source.category !== categoryFilter) return false;
    if (searchTerm) {
      const search = searchTerm.toLowerCase();
      return (
        source.radionuclide.toLowerCase().includes(search) ||
        source.description?.toLowerCase().includes(search) ||
        source.serial_number?.toLowerCase().includes(search) ||
        source.location_department?.toLowerCase().includes(search) ||
        source.location_room?.toLowerCase().includes(search)
      );
    }
    return true;
  });

  const formatActivity = (activity: number | undefined, unit: string) => {
    if (activity === undefined || activity === null) return "-";
    if (activity < 0.001) return `${(activity * 1000000).toFixed(2)} n${unit.replace("M", "").replace("G", "").replace("k", "")}`;
    if (activity < 1) return `${(activity * 1000).toFixed(2)} ${unit.replace("M", "k").replace("G", "M")}`;
    if (activity > 1000) return `${(activity / 1000).toFixed(2)} ${unit.replace("M", "G").replace("k", "M")}`;
    return `${activity.toFixed(2)} ${unit}`;
  };

  const getStatusColor = (status: SourceStatus) => {
    switch (status) {
      case "active":
        return "bg-green-100 text-green-800";
      case "stored":
        return "bg-blue-100 text-blue-800";
      case "lost":
        return "bg-red-100 text-red-800";
      case "stolen":
        return "bg-red-200 text-red-900";
      case "discarded":
        return "bg-gray-100 text-gray-800";
      case "transferred":
        return "bg-purple-100 text-purple-800";
      case "decayed":
        return "bg-yellow-100 text-yellow-800";
      default:
        return "bg-gray-100 text-gray-800";
    }
  };

  const handleAddSource = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setError(null);

    try {
      const response = await fetch("/api/sources", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...formData,
          initial_activity: formData.initial_activity || 0,
          license_item_number: formData.license_item_number || null,
        }),
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || "Failed to add source");
      }

      setShowAddModal(false);
      setFormData(initialFormData);
      loadData();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to add source");
    } finally {
      setSaving(false);
    }
  };

  const handleEditSource = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedSource) return;

    setSaving(true);
    setError(null);

    try {
      const response = await fetch(`/api/sources/${selectedSource.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...formData,
          initial_activity: formData.initial_activity || 0,
          license_item_number: formData.license_item_number || null,
        }),
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || "Failed to update source");
      }

      setShowEditModal(false);
      setSelectedSource(null);
      setFormData(initialFormData);
      loadData();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to update source");
    } finally {
      setSaving(false);
    }
  };

  const handleStatusChange = async (newStatus: SourceStatus, notes: string) => {
    if (!selectedSource) return;

    setSaving(true);
    setError(null);

    try {
      const response = await fetch(`/api/sources/${selectedSource.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          status: newStatus,
          status_notes: notes,
        }),
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || "Failed to update status");
      }

      setShowStatusModal(false);
      setSelectedSource(null);
      loadData();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to update status");
    } finally {
      setSaving(false);
    }
  };

  const openEditModal = (source: RadioactiveSource) => {
    setSelectedSource(source);
    setFormData({
      radionuclide: source.radionuclide,
      source_form: source.source_form,
      description: source.description || "",
      serial_number: source.serial_number || "",
      container_serial: source.container_serial || "",
      license_item_number: source.license_item_number || "",
      initial_activity: source.initial_activity,
      activity_unit: source.activity_unit,
      calibration_date: source.calibration_date,
      category: source.category,
      room_type: source.room_type || "",
      location_building: source.location_building || "",
      location_floor: source.location_floor || "",
      location_room: source.location_room || "",
      location_department: source.location_department || "",
      location_detail: source.location_detail || "",
      status: source.status,
      status_notes: source.status_notes || "",
      acquired_date: source.acquired_date || "",
      acquired_from: source.acquired_from || "",
      notes: source.notes || "",
    });
    setShowEditModal(true);
  };

  const getRadionuclideInfo = (nuclide: string) => {
    return radionuclideData.find(
      (r) => r.radionuclide.toUpperCase() === nuclide.toUpperCase()
    );
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Radioactive Source Inventory</h1>
          <p className="text-gray-500">Track and manage radioactive sources for license compliance</p>
        </div>
        <button
          onClick={() => {
            setFormData(initialFormData);
            setShowAddModal(true);
          }}
          className="px-4 py-2 bg-primary text-primary-foreground rounded-md hover:bg-primary/90 flex items-center gap-2"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
          </svg>
          Add Source
        </button>
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-md">
          {error}
        </div>
      )}

      {/* Filters */}
      <div className="bg-white rounded-lg border p-4">
        <div className="flex flex-wrap gap-4">
          <div className="flex-1 min-w-[200px]">
            <input
              type="text"
              placeholder="Search radionuclide, description, serial number..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary"
            />
          </div>
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value as SourceStatus | "all")}
            className="px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary"
          >
            <option value="all">All Status</option>
            {Object.entries(SOURCE_STATUS_LABELS).map(([value, label]) => (
              <option key={value} value={value}>
                {label}
              </option>
            ))}
          </select>
          <select
            value={categoryFilter}
            onChange={(e) => setCategoryFilter(e.target.value as SourceCategory | "all")}
            className="px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary"
          >
            <option value="all">All Categories</option>
            {Object.entries(SOURCE_CATEGORY_LABELS).map(([value, label]) => (
              <option key={value} value={value}>
                {label}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Summary Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <div className="bg-white rounded-lg border p-4">
          <div className="text-2xl font-bold text-gray-900">{sources.length}</div>
          <div className="text-sm text-gray-500">Total Sources</div>
        </div>
        <div className="bg-white rounded-lg border p-4">
          <div className="text-2xl font-bold text-green-600">
            {sources.filter((s) => s.status === "active").length}
          </div>
          <div className="text-sm text-gray-500">Active</div>
        </div>
        <div className="bg-white rounded-lg border p-4">
          <div className="text-2xl font-bold text-blue-600">
            {sources.filter((s) => s.status === "stored").length}
          </div>
          <div className="text-sm text-gray-500">Stored</div>
        </div>
        <div className="bg-white rounded-lg border p-4">
          <div className="text-2xl font-bold text-red-600">
            {sources.filter((s) => s.status === "lost" || s.status === "stolen").length}
          </div>
          <div className="text-sm text-gray-500">Lost/Stolen</div>
        </div>
      </div>

      {/* Sources Table */}
      <div className="bg-white rounded-lg border overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">#</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Radionuclide</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Description</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Initial Activity</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Current Activity</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Category</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Location</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Status</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {filteredSources.length === 0 ? (
                <tr>
                  <td colSpan={9} className="px-4 py-8 text-center text-gray-500">
                    No sources found
                  </td>
                </tr>
              ) : (
                filteredSources.map((source, index) => {
                  const nuclideInfo = getRadionuclideInfo(source.radionuclide);
                  return (
                    <tr key={source.id} className="hover:bg-gray-50">
                      <td className="px-4 py-3 text-sm text-gray-500">
                        {source.license_item_number || index + 1}
                      </td>
                      <td className="px-4 py-3">
                        <div className="font-medium text-gray-900">{source.radionuclide}</div>
                        {nuclideInfo && (
                          <div className="text-xs text-gray-500">
                            T½: {nuclideInfo.half_life_display}
                          </div>
                        )}
                      </td>
                      <td className="px-4 py-3 text-sm text-gray-600 max-w-[200px] truncate">
                        {source.description || "-"}
                        {source.serial_number && (
                          <div className="text-xs text-gray-400">S/N: {source.serial_number}</div>
                        )}
                      </td>
                      <td className="px-4 py-3 text-sm font-mono">
                        {formatActivity(source.initial_activity, source.activity_unit)}
                        <div className="text-xs text-gray-400">
                          {new Date(source.calibration_date).toLocaleDateString()}
                        </div>
                      </td>
                      <td className="px-4 py-3 text-sm font-mono">
                        {source.current_activity !== undefined ? (
                          <>
                            <span className={source.current_activity < source.initial_activity * 0.01 ? "text-yellow-600" : "text-green-600"}>
                              {formatActivity(source.current_activity, source.activity_unit)}
                            </span>
                            {source.days_since_calibration !== undefined && (
                              <div className="text-xs text-gray-400">
                                {Math.floor(source.days_since_calibration)}d elapsed
                              </div>
                            )}
                          </>
                        ) : (
                          "-"
                        )}
                      </td>
                      <td className="px-4 py-3">
                        <span className="text-xs px-2 py-1 rounded bg-gray-100 text-gray-700">
                          {SOURCE_CATEGORY_LABELS[source.category]}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-sm text-gray-600">
                        {source.location_department || source.location_room ? (
                          <>
                            <div>{source.location_department}</div>
                            <div className="text-xs text-gray-400">{source.location_room}</div>
                          </>
                        ) : (
                          "-"
                        )}
                      </td>
                      <td className="px-4 py-3">
                        <span className={`text-xs px-2 py-1 rounded font-medium ${getStatusColor(source.status)}`}>
                          {SOURCE_STATUS_LABELS[source.status]}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2">
                          <button
                            onClick={() => openEditModal(source)}
                            className="text-blue-600 hover:text-blue-800 text-sm"
                          >
                            Edit
                          </button>
                          <button
                            onClick={() => {
                              setSelectedSource(source);
                              setShowStatusModal(true);
                            }}
                            className="text-amber-600 hover:text-amber-800 text-sm"
                          >
                            Status
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Add/Edit Modal */}
      {(showAddModal || showEditModal) && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg shadow-xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
            <div className="p-6">
              <h2 className="text-xl font-bold mb-4">
                {showAddModal ? "Add New Source" : "Edit Source"}
              </h2>
              <form onSubmit={showAddModal ? handleAddSource : handleEditSource}>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {/* Radionuclide */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Radionuclide *
                    </label>
                    <select
                      value={formData.radionuclide}
                      onChange={(e) => setFormData({ ...formData, radionuclide: e.target.value })}
                      required
                      className="w-full px-3 py-2 border border-gray-300 rounded-md"
                    >
                      <option value="">Select radionuclide</option>
                      {COMMON_RADIONUCLIDES.map((r) => (
                        <option key={r} value={r}>
                          {r}
                        </option>
                      ))}
                      <option value="OTHER">Other (specify in description)</option>
                    </select>
                  </div>

                  {/* Form */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Source Form
                    </label>
                    <select
                      value={formData.source_form}
                      onChange={(e) => setFormData({ ...formData, source_form: e.target.value as SourceForm })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md"
                    >
                      {Object.entries(SOURCE_FORM_LABELS).map(([value, label]) => (
                        <option key={value} value={value}>
                          {label}
                        </option>
                      ))}
                    </select>
                  </div>

                  {/* Activity */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Initial Activity *
                    </label>
                    <input
                      type="number"
                      step="any"
                      value={formData.initial_activity}
                      onChange={(e) => setFormData({ ...formData, initial_activity: e.target.value ? parseFloat(e.target.value) : "" })}
                      required
                      className="w-full px-3 py-2 border border-gray-300 rounded-md"
                    />
                  </div>

                  {/* Unit */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Activity Unit
                    </label>
                    <select
                      value={formData.activity_unit}
                      onChange={(e) => setFormData({ ...formData, activity_unit: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md"
                    >
                      <option value="kBq">kBq</option>
                      <option value="MBq">MBq</option>
                      <option value="GBq">GBq</option>
                      <option value="TBq">TBq</option>
                      <option value="mCi">mCi</option>
                      <option value="Ci">Ci</option>
                    </select>
                  </div>

                  {/* Calibration Date */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Calibration Date *
                    </label>
                    <input
                      type="date"
                      value={formData.calibration_date}
                      onChange={(e) => setFormData({ ...formData, calibration_date: e.target.value })}
                      required
                      className="w-full px-3 py-2 border border-gray-300 rounded-md"
                    />
                  </div>

                  {/* Category */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Category
                    </label>
                    <select
                      value={formData.category}
                      onChange={(e) => setFormData({ ...formData, category: e.target.value as SourceCategory })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md"
                    >
                      {Object.entries(SOURCE_CATEGORY_LABELS).map(([value, label]) => (
                        <option key={value} value={value}>
                          {label}
                        </option>
                      ))}
                    </select>
                  </div>

                  {/* License Item Number */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      License Item #
                    </label>
                    <input
                      type="number"
                      value={formData.license_item_number}
                      onChange={(e) => setFormData({ ...formData, license_item_number: e.target.value ? parseInt(e.target.value) : "" })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md"
                    />
                  </div>

                  {/* Serial Number */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Serial Number
                    </label>
                    <input
                      type="text"
                      value={formData.serial_number}
                      onChange={(e) => setFormData({ ...formData, serial_number: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md"
                    />
                  </div>

                  {/* Container Serial */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Container S/N
                    </label>
                    <input
                      type="text"
                      value={formData.container_serial}
                      onChange={(e) => setFormData({ ...formData, container_serial: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md"
                    />
                  </div>

                  {/* Description - Full Width */}
                  <div className="sm:col-span-2">
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Description
                    </label>
                    <input
                      type="text"
                      value={formData.description}
                      onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                      placeholder="e.g., Eye applicator, RO Dept"
                      className="w-full px-3 py-2 border border-gray-300 rounded-md"
                    />
                  </div>

                  {/* Location Section */}
                  <div className="sm:col-span-2 border-t pt-4 mt-2">
                    <h3 className="font-medium text-gray-900 mb-3">Location</h3>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          Department
                        </label>
                        <input
                          type="text"
                          value={formData.location_department}
                          onChange={(e) => setFormData({ ...formData, location_department: e.target.value })}
                          placeholder="e.g., Nuclear Medicine Department"
                          className="w-full px-3 py-2 border border-gray-300 rounded-md"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          Room
                        </label>
                        <input
                          type="text"
                          value={formData.location_room}
                          onChange={(e) => setFormData({ ...formData, location_room: e.target.value })}
                          placeholder="e.g., Lab no 59, Ground Floor"
                          className="w-full px-3 py-2 border border-gray-300 rounded-md"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          Room Type
                        </label>
                        <input
                          type="text"
                          value={formData.room_type}
                          onChange={(e) => setFormData({ ...formData, room_type: e.target.value })}
                          placeholder="e.g., Type B, Type C, RIA LAB"
                          className="w-full px-3 py-2 border border-gray-300 rounded-md"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          Building/Floor
                        </label>
                        <input
                          type="text"
                          value={formData.location_floor}
                          onChange={(e) => setFormData({ ...formData, location_floor: e.target.value })}
                          placeholder="e.g., Ground Floor, 1st Floor"
                          className="w-full px-3 py-2 border border-gray-300 rounded-md"
                        />
                      </div>
                    </div>
                  </div>

                  {/* Notes */}
                  <div className="sm:col-span-2">
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Notes
                    </label>
                    <textarea
                      value={formData.notes}
                      onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                      rows={2}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md"
                    />
                  </div>
                </div>

                <div className="flex justify-end gap-3 mt-6 pt-4 border-t">
                  <button
                    type="button"
                    onClick={() => {
                      setShowAddModal(false);
                      setShowEditModal(false);
                      setSelectedSource(null);
                      setFormData(initialFormData);
                    }}
                    className="px-4 py-2 border border-gray-300 rounded-md hover:bg-gray-50"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={saving}
                    className="px-4 py-2 bg-primary text-primary-foreground rounded-md hover:bg-primary/90 disabled:opacity-50"
                  >
                    {saving ? "Saving..." : showAddModal ? "Add Source" : "Save Changes"}
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}

      {/* Status Change Modal */}
      {showStatusModal && selectedSource && (
        <StatusChangeModal
          source={selectedSource}
          onClose={() => {
            setShowStatusModal(false);
            setSelectedSource(null);
          }}
          onSave={handleStatusChange}
          saving={saving}
        />
      )}
    </div>
  );
}

function StatusChangeModal({
  source,
  onClose,
  onSave,
  saving,
}: {
  source: RadioactiveSource;
  onClose: () => void;
  onSave: (status: SourceStatus, notes: string) => void;
  saving: boolean;
}) {
  const [newStatus, setNewStatus] = useState<SourceStatus>(source.status);
  const [notes, setNotes] = useState("");

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-md">
        <div className="p-6">
          <h2 className="text-xl font-bold mb-4">Change Source Status</h2>
          <div className="mb-4">
            <p className="text-sm text-gray-600 mb-2">
              <strong>{source.radionuclide}</strong> - {source.description || "No description"}
            </p>
            <p className="text-xs text-gray-500">
              Current status: <span className="font-medium">{SOURCE_STATUS_LABELS[source.status]}</span>
            </p>
          </div>

          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                New Status
              </label>
              <select
                value={newStatus}
                onChange={(e) => setNewStatus(e.target.value as SourceStatus)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md"
              >
                {Object.entries(SOURCE_STATUS_LABELS).map(([value, label]) => (
                  <option key={value} value={value}>
                    {label}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Reason/Notes
              </label>
              <textarea
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                rows={3}
                placeholder="Explain the reason for this status change..."
                className="w-full px-3 py-2 border border-gray-300 rounded-md"
              />
            </div>

            {newStatus === "lost" && (
              <div className="bg-red-50 border border-red-200 rounded-md p-3 text-sm text-red-700">
                <strong>Warning:</strong> Marking a source as lost may require notification to
                regulatory authorities. Ensure proper documentation.
              </div>
            )}

            {newStatus === "stolen" && (
              <div className="bg-red-50 border border-red-200 rounded-md p-3 text-sm text-red-700">
                <strong>Warning:</strong> A stolen source must be reported to authorities
                immediately. Document all details and contact relevant agencies.
              </div>
            )}
          </div>

          <div className="flex justify-end gap-3 mt-6 pt-4 border-t">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 border border-gray-300 rounded-md hover:bg-gray-50"
            >
              Cancel
            </button>
            <button
              onClick={() => onSave(newStatus, notes)}
              disabled={saving || newStatus === source.status}
              className="px-4 py-2 bg-primary text-primary-foreground rounded-md hover:bg-primary/90 disabled:opacity-50"
            >
              {saving ? "Saving..." : "Update Status"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
