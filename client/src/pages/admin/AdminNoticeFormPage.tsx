import { useEffect, useState, type FormEvent } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { api, ApiError } from '../../lib/api';
import AdminScreen from '../../components/admin/AdminScreen';
import Button from '../../components/Button';
import { FieldWrap, Input, Select, Textarea, Switch } from '../../components/primitives';
import { LoadingState, ErrorState } from '../../components/States';
import type { AdminNotice } from '../../types';

const CATEGORIES = ['general', 'maintenance', 'safety', 'events', 'academic'];
const PRIORITIES = [
  { value: 'normal', label: 'Normal' },
  { value: 'important', label: 'Important' },
  { value: 'urgent', label: 'Urgent' },
];

export default function AdminNoticeFormPage() {
  const { id } = useParams();
  const isEdit = !!id;
  const navigate = useNavigate();

  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [category, setCategory] = useState('general');
  const [priority, setPriority] = useState('normal');
  const [published, setPublished] = useState(true);

  const [loading, setLoading] = useState(isEdit);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [formError, setFormError] = useState('');
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [deleteError, setDeleteError] = useState('');
  const [confirmingDelete, setConfirmingDelete] = useState(false);

  async function load() {
    if (!isEdit) return;
    setLoading(true);
    setLoadError(null);
    try {
      const data = await api.get<AdminNotice>(`/admin/notices/${id}`);
      setTitle(data.title);
      setDescription(data.description);
      setCategory(data.category);
      setPriority(data.priority);
      setPublished(data.published);
    } catch (e) {
      setLoadError(e instanceof ApiError ? e.message : 'Could not load this notice.');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setFormError('');
    setFieldErrors({});
    const errors: Record<string, string> = {};
    if (!title.trim()) errors.title = 'Title is required';
    if (!description.trim()) errors.description = 'Description is required';
    if (Object.keys(errors).length > 0) {
      setFieldErrors(errors);
      return;
    }

    setSaving(true);
    try {
      const payload = { title: title.trim(), description: description.trim(), category, priority, published };
      if (isEdit) {
        await api.patch(`/admin/notices/${id}`, payload);
      } else {
        await api.post('/admin/notices', payload);
      }
      navigate('/admin/notices', { replace: true });
    } catch (err) {
      if (err instanceof ApiError) {
        if (err.fields) setFieldErrors(err.fields);
        else setFormError(err.message);
      } else {
        setFormError('Could not save this notice. Please try again.');
      }
    } finally {
      setSaving(false);
    }
  }

  async function confirmDelete() {
    setDeleting(true);
    setDeleteError('');
    try {
      await api.delete(`/admin/notices/${id}`);
      navigate('/admin/notices', { replace: true });
    } catch (e) {
      setDeleteError(e instanceof ApiError ? e.message : 'Could not delete this notice.');
    } finally {
      setDeleting(false);
    }
  }

  return (
    <AdminScreen>
      <div className="pt-[calc(env(safe-area-inset-top)+18px)] pb-5 flex items-center gap-3 lg:pt-8 lg:pb-6 lg:border-b lg:border-[var(--color-border)] lg:mb-6">
        <button onClick={() => navigate('/admin/notices')} aria-label="Back to notices" className="h-9 w-9 flex items-center justify-center rounded-full border border-[var(--color-border)] shrink-0">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M15 18l-6-6 6-6" /></svg>
        </button>
        <h1 className="font-display font-bold text-lg lg:text-2xl text-[var(--color-ink)]">{isEdit ? 'Edit notice' : 'New notice'}</h1>
      </div>

      {loading && <LoadingState label="Loading notice" />}
      {!loading && loadError && <ErrorState message={loadError} onRetry={load} />}
      {!loading && !loadError && (
        <form onSubmit={handleSubmit} className="space-y-4 lg:max-w-xl" noValidate>
          <FieldWrap label="Title" error={fieldErrors.title}>
            <Input value={title} onChange={(e) => setTitle(e.target.value)} error={fieldErrors.title} />
          </FieldWrap>

          <FieldWrap label="Description" error={fieldErrors.description}>
            <Textarea value={description} onChange={(e) => setDescription(e.target.value)} error={fieldErrors.description} />
          </FieldWrap>

          <FieldWrap label="Category">
            <Select value={category} onChange={(e) => setCategory(e.target.value)}>
              {CATEGORIES.map((c) => <option key={c} value={c}>{c}</option>)}
            </Select>
          </FieldWrap>

          <FieldWrap label="Priority" error={fieldErrors.priority}>
            <Select value={priority} onChange={(e) => setPriority(e.target.value)} error={fieldErrors.priority}>
              {PRIORITIES.map((p) => <option key={p.value} value={p.value}>{p.label}</option>)}
            </Select>
          </FieldWrap>

          <div className="flex items-center justify-between rounded-[var(--radius-md)] border border-[var(--color-border)] px-4 py-3.5">
            <div>
              <p className="text-sm font-semibold text-[var(--color-ink)]">Published</p>
              <p className="text-xs text-[var(--color-ink-muted)] mt-0.5">Visible to students when on</p>
            </div>
            <Switch checked={published} onChange={setPublished} label="Published" />
          </div>

          {formError && (
            <p role="alert" className="text-sm text-[var(--color-danger)] bg-[var(--color-danger-soft)] rounded-[var(--radius-sm)] px-3 py-2">
              {formError}
            </p>
          )}

          <Button type="submit" fullWidth loading={saving}>
            {isEdit ? 'Save changes' : 'Create notice'}
          </Button>

          {isEdit && (
            <div>
              {!confirmingDelete ? (
                <Button type="button" variant="ghost" fullWidth onClick={() => setConfirmingDelete(true)}>
                  Delete notice
                </Button>
              ) : (
                <div className="rounded-[var(--radius-md)] border border-[var(--color-danger)] bg-[var(--color-danger-soft)] p-3.5 space-y-2.5">
                  <p className="text-sm text-[var(--color-danger)]">Delete this notice permanently?</p>
                  {deleteError && <p className="text-xs text-[var(--color-danger)]">{deleteError}</p>}
                  <div className="flex gap-2">
                    <Button type="button" size="sm" variant="danger" loading={deleting} onClick={confirmDelete}>
                      Confirm delete
                    </Button>
                    <Button type="button" size="sm" variant="ghost" onClick={() => setConfirmingDelete(false)}>
                      Cancel
                    </Button>
                  </div>
                </div>
              )}
            </div>
          )}
        </form>
      )}
    </AdminScreen>
  );
}
