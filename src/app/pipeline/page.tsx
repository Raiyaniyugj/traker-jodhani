'use client';

import { useState, useEffect } from 'react';
import Sidebar from '@/components/Sidebar';
import Header from '@/components/Header';
import { PipelineStage, Role } from '@/lib/types';
import { GripVertical, Plus, Check, Trash2, ChevronUp, ChevronDown } from 'lucide-react';

const AVAILABLE_ROLES: Role[] = ['Admin', 'CAD Designer', 'Manufacturer', 'QC Manager'];

export default function PipelinePage() {
  const [stages, setStages] = useState<PipelineStage[]>([]);
  const [loading, setLoading] = useState(true);
  const [newStepName, setNewStepName] = useState('');
  const [selectedRoles, setSelectedRoles] = useState<Role[]>(['Admin']);
  const [saving, setSaving] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [draggedIndex, setDraggedIndex] = useState<number | null>(null);
  const [dragOverIndex, setDragOverIndex] = useState<number | null>(null);
  const [isReordering, setIsReordering] = useState(false);

  useEffect(() => {
    loadStages();
  }, []);

  const loadStages = async () => {
    try {
      setLoading(true);
      const res = await fetch('/api/pipeline');
      if (res.ok) {
        const data = await res.json();
        setStages(data.stages || []);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  const toggleRole = (role: Role) => {
    if (selectedRoles.includes(role)) {
      if (selectedRoles.length > 1) {
        setSelectedRoles(selectedRoles.filter((r) => r !== role));
      }
    } else {
      setSelectedRoles([...selectedRoles, role]);
    }
  };

  const persistReorder = async (newStages: PipelineStage[]) => {
    setIsReordering(true);
    try {
      await fetch('/api/pipeline', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ stages: newStages }),
      });
    } catch (e) {
      console.error('Failed to save reordered stages:', e);
      loadStages();
    } finally {
      setIsReordering(false);
    }
  };

  const moveStep = (index: number, direction: 'up' | 'down') => {
    const targetIndex = direction === 'up' ? index - 1 : index + 1;
    if (targetIndex < 0 || targetIndex >= stages.length) return;

    const updated = [...stages];
    const [moved] = updated.splice(index, 1);
    updated.splice(targetIndex, 0, moved);
    const reordered = updated.map((s, idx) => ({ ...s, order: idx + 1 }));
    setStages(reordered);
    persistReorder(reordered);
  };

  const handleDragStart = (e: React.DragEvent, index: number) => {
    setDraggedIndex(index);
    e.dataTransfer.effectAllowed = 'move';
    e.dataTransfer.setData('text/plain', `${index}`);
  };

  const handleDragOver = (e: React.DragEvent, index: number) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
    if (dragOverIndex !== index) {
      setDragOverIndex(index);
    }
  };

  const handleDrop = (e: React.DragEvent, dropIndex: number) => {
    e.preventDefault();
    if (draggedIndex === null || draggedIndex === dropIndex) {
      setDraggedIndex(null);
      setDragOverIndex(null);
      return;
    }

    const updated = [...stages];
    const [movedStage] = updated.splice(draggedIndex, 1);
    updated.splice(dropIndex, 0, movedStage);

    const reordered = updated.map((s, idx) => ({ ...s, order: idx + 1 }));
    setStages(reordered);
    setDraggedIndex(null);
    setDragOverIndex(null);
    persistReorder(reordered);
  };

  const handleDragEnd = () => {
    setDraggedIndex(null);
    setDragOverIndex(null);
  };

  const handleAddStep = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newStepName.trim()) return;
    setSaving(true);
    try {
      const res = await fetch('/api/pipeline', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: newStepName.trim(),
          roles: selectedRoles,
        }),
      });
      if (res.ok) {
        setNewStepName('');
        setSelectedRoles(['Admin']);
        loadStages();
      }
    } catch (e) {
      console.error(e);
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteStep = async (stageId: string, stageName: string) => {
    if (stages.length <= 1) {
      alert('You cannot delete the only remaining stage.');
      return;
    }
    const confirmed = window.confirm(
      `Are you sure you want to delete "${stageName}"? Any orders at this step will be safely moved to the first stage.`
    );
    if (!confirmed) return;

    setDeletingId(stageId);
    try {
      const res = await fetch(`/api/pipeline?id=${stageId}`, {
        method: 'DELETE',
      });
      const data = await res.json();
      if (res.ok && data.success) {
        setStages(data.stages || stages.filter((s) => s.id !== stageId));
      } else {
        alert(data.error || 'Failed to delete step');
      }
    } catch (err: any) {
      alert(err.message || 'Error deleting step');
    } finally {
      setDeletingId(null);
    }
  };

  return (
    <div className="flex min-h-screen bg-neutral-50 text-neutral-900">
      <Sidebar />

      <div className="flex-1 flex flex-col min-w-0">
        <Header title="Pipeline Management" />

        <main className="p-8 max-w-6xl w-full mx-auto">
          <p className="text-sm text-neutral-500 mb-6">
            This workspace has one production pipeline. Drag by the 6 dots to reorder steps or manage role access.
          </p>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            {/* Steps List */}
            <div className="lg:col-span-2 space-y-3">
              {stages.map((stage, idx) => {
                const isDragging = draggedIndex === idx;
                const isOver = dragOverIndex === idx && draggedIndex !== idx;

                return (
                  <div
                    key={stage.id}
                    draggable
                    onDragStart={(e) => handleDragStart(e, idx)}
                    onDragOver={(e) => handleDragOver(e, idx)}
                    onDrop={(e) => handleDrop(e, idx)}
                    onDragEnd={handleDragEnd}
                    className={`bg-white border rounded-xl p-4.5 flex items-center justify-between transition-all duration-150 ${
                      isDragging
                        ? 'opacity-40 border-dashed border-neutral-400 bg-neutral-100 scale-[0.99]'
                        : isOver
                        ? 'border-neutral-900 ring-2 ring-neutral-900/10 shadow-md bg-neutral-50/50'
                        : 'border-neutral-200 shadow-2xs hover:border-neutral-300'
                    }`}
                  >
                    <div className="flex items-center gap-3.5">
                      <div
                        title="Drag 6 dots to reshuffle"
                        className="cursor-grab active:cursor-grabbing text-neutral-400 hover:text-neutral-900 p-1.5 -m-1.5 rounded-md hover:bg-neutral-100 transition"
                      >
                        <GripVertical className="w-4 h-4" />
                      </div>
                      <div>
                        <p className="text-xs text-neutral-400 font-mono">Step {idx + 1}</p>
                        <h3 className="font-semibold text-neutral-900 text-sm mt-0.5">
                          {stage.name}
                        </h3>
                        <p className="text-xs text-neutral-500 mt-0.5">
                          Access: {stage.roles.join(', ')}
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center gap-2">
                      {/* Up/Down buttons for quick click reordering */}
                      <div className="flex items-center gap-0.5 mr-1 border border-neutral-200 rounded-lg p-0.5 bg-neutral-50">
                        <button
                          type="button"
                          onClick={() => moveStep(idx, 'up')}
                          disabled={idx === 0 || isReordering}
                          title="Move step up"
                          className="p-1 text-neutral-400 hover:text-neutral-900 hover:bg-white rounded transition disabled:opacity-20 disabled:cursor-not-allowed"
                        >
                          <ChevronUp className="w-3.5 h-3.5" />
                        </button>
                        <button
                          type="button"
                          onClick={() => moveStep(idx, 'down')}
                          disabled={idx === stages.length - 1 || isReordering}
                          title="Move step down"
                          className="p-1 text-neutral-400 hover:text-neutral-900 hover:bg-white rounded transition disabled:opacity-20 disabled:cursor-not-allowed"
                        >
                          <ChevronDown className="w-3.5 h-3.5" />
                        </button>
                      </div>

                      <span className="text-xs font-mono text-neutral-400 px-2 py-1 bg-neutral-50 rounded border border-neutral-100">
                        Active
                      </span>
                      <button
                        type="button"
                        onClick={() => handleDeleteStep(stage.id, stage.name)}
                        disabled={deletingId === stage.id}
                        title={`Delete step "${stage.name}"`}
                        className="p-1.5 text-neutral-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition disabled:opacity-40"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Add Step Card */}
            <div>
              <div className="bg-white border border-neutral-200 rounded-xl p-6 shadow-2xs sticky top-24">
                <h3 className="font-semibold text-neutral-900 text-base mb-1">
                  Add Step
                </h3>
                <p className="text-xs text-neutral-500 mb-4">
                  Add custom milestone to your jewelry pipeline
                </p>

                <form onSubmit={handleAddStep} className="space-y-4">
                  <div>
                    <label className="block text-xs font-medium text-neutral-500 mb-1">
                      Step Name
                    </label>
                    <input
                      type="text"
                      required
                      value={newStepName}
                      onChange={(e) => setNewStepName(e.target.value)}
                      placeholder="e.g. Laser Engraving"
                      className="w-full text-sm border border-neutral-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-1 focus:ring-black"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-medium text-neutral-500 mb-2">
                      Role Access
                    </label>
                    <div className="space-y-2">
                      {AVAILABLE_ROLES.map((role) => (
                        <label
                          key={role}
                          className="flex items-center gap-2 text-xs text-neutral-700 cursor-pointer"
                        >
                          <input
                            type="checkbox"
                            checked={selectedRoles.includes(role)}
                            onChange={() => toggleRole(role)}
                            className="rounded border-neutral-300 text-black focus:ring-black"
                          />
                          <span>{role}</span>
                        </label>
                      ))}
                    </div>
                  </div>

                  <button
                    type="submit"
                    disabled={saving}
                    className="w-full bg-black text-white text-xs font-medium py-2.5 rounded-lg hover:bg-neutral-800 transition"
                  >
                    {saving ? 'Adding...' : 'Add Step to Pipeline'}
                  </button>
                </form>
              </div>
            </div>
          </div>
        </main>
      </div>
    </div>
  );
}
