import { useRef, useState, type FormEvent } from 'react';
import { useNavigate } from 'react-router-dom';
import { api, ApiError } from '../../lib/api';
import Screen from '../../components/Screen';
import Button from '../../components/Button';
import { FieldWrap, Input, Select, Textarea } from '../../components/primitives';
import type { Complaint } from '../../types';

const CATEGORIES = ['Electrical', 'Plumbing', 'Furniture', 'Cleanliness', 'Internet/Wi-Fi', 'Security', 'Other'];
const PRIORITIES: { value: string; label: string }[] = [
  { value: 'low', label: 'Low' },
  { value: 'normal', label: 'Normal' },
  { value: 'high', label: 'High' },
  { value: 'urgent', label: 'Urgent' },
];
const MAX_IMAGE_BYTES = 2 * 1024 * 1024; // 2MB, matches the server-side ceiling

export default function ComplaintApplyPage() {
  const navigate = useNavigate();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [category, setCategory] = useState('');
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [location, setLocation] = useState('');
  const [priority, setPriority] = useState('normal');
  const [imageDataUrl, setImageDataUrl] = useState<string | null>(null);
  const [imageName, setImageName] = useState('');

  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [formError, setFormError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  function validate() {
    const errors: Record<string, string> = {};
    if (!category) errors.category = 'Select a category';
    if (!title.trim()) errors.title = 'Title is required';
    else if (title.trim().length > 120) errors.title = 'Title must be under 120 characters';
    if (!description.trim()) errors.description = 'Description is required';
    return errors;
  }

  function handleImageChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      setFieldErrors((prev) => ({ ...prev, image: 'Please choose an image file' }));
      return;
    }
    if (file.size > MAX_IMAGE_BYTES) {
      setFieldErrors((prev) => ({ ...prev, image: 'Image must be under 2MB' }));
      return;
    }

    setFieldErrors((prev) => {
      const rest = { ...prev };
      delete rest.image;
      return rest;
    });

    const reader = new FileReader();
    reader.onload = () => {
      setImageDataUrl(reader.result as string);
      setImageName(file.name);
    };
    reader.readAsDataURL(file);
  }

  function removeImage() {
    setImageDataUrl(null);
    setImageName('');
    if (fileInputRef.current) fileInputRef.current.value = '';
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setFormError('');
    const errors = validate();
    setFieldErrors((prev) => ({ ...(prev.image ? { image: prev.image } : {}), ...errors }));
    if (Object.keys(errors).length > 0) return;

    setSubmitting(true);
    try {
      const created = await api.post<Complaint>('/complaints', {
        category,
        title: title.trim(),
        description: description.trim(),
        location: location.trim() || undefined,
        priority,
        imageUrl: imageDataUrl || undefined,
      });
      navigate(`/student/complaints/${created.id}`, { replace: true, state: { justSubmitted: true } });
    } catch (err) {
      if (err instanceof ApiError) {
        if (err.fields) setFieldErrors((prev) => ({ ...prev, ...err.fields }));
        else setFormError(err.message);
      } else {
        setFormError('Could not submit your complaint. Please try again.');
      }
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <Screen>
      <div className="pt-[calc(env(safe-area-inset-top)+18px)] pb-5 flex items-center gap-3">
        <button onClick={() => navigate(-1)} aria-label="Back" className="h-9 w-9 flex items-center justify-center rounded-full border border-[var(--color-border)]">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M15 18l-6-6 6-6" /></svg>
        </button>
        <h1 className="font-display font-bold text-lg text-[var(--color-ink)]">Raise a complaint</h1>
      </div>

      <form onSubmit={handleSubmit} className="space-y-4" noValidate>
        <FieldWrap label="Category" error={fieldErrors.category}>
          <Select value={category} onChange={(e) => setCategory(e.target.value)} error={fieldErrors.category}>
            <option value="">Select category</option>
            {CATEGORIES.map((c) => (
              <option key={c} value={c}>{c}</option>
            ))}
          </Select>
        </FieldWrap>

        <FieldWrap label="Title" error={fieldErrors.title}>
          <Input
            placeholder="Brief summary of the issue"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            error={fieldErrors.title}
            maxLength={120}
          />
        </FieldWrap>

        <FieldWrap label="Description" error={fieldErrors.description}>
          <Textarea
            placeholder="Describe the issue in detail"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            error={fieldErrors.description}
          />
        </FieldWrap>

        <FieldWrap label="Room / location (optional)">
          <Input
            placeholder="e.g. Room 214, 2nd floor common bathroom"
            value={location}
            onChange={(e) => setLocation(e.target.value)}
          />
        </FieldWrap>

        <FieldWrap label="Priority">
          <Select value={priority} onChange={(e) => setPriority(e.target.value)}>
            {PRIORITIES.map((p) => (
              <option key={p.value} value={p.value}>{p.label}</option>
            ))}
          </Select>
        </FieldWrap>

        <FieldWrap label="Photo (optional)" error={fieldErrors.image}>
          {!imageDataUrl ? (
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              className="w-full h-12 rounded-[var(--radius-md)] border border-dashed border-[var(--color-border-strong)] text-sm font-medium text-[var(--color-ink-muted)] flex items-center justify-center gap-2"
            >
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                <rect x="3" y="5" width="18" height="14" rx="2" /><circle cx="9" cy="10" r="2" /><path d="M21 15l-5-4-9 7" />
              </svg>
              Add a photo
            </button>
          ) : (
            <div className="flex items-center gap-3 rounded-[var(--radius-md)] border border-[var(--color-border-strong)] p-2.5">
              <img src={imageDataUrl} alt="Complaint attachment preview" className="h-14 w-14 rounded-[var(--radius-sm)] object-cover shrink-0" />
              <span className="text-sm text-[var(--color-ink)] truncate flex-1">{imageName}</span>
              <button type="button" onClick={removeImage} className="text-sm font-semibold text-[var(--color-danger)] shrink-0">
                Remove
              </button>
            </div>
          )}
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            onChange={handleImageChange}
            className="hidden"
          />
        </FieldWrap>

        {formError && (
          <p role="alert" className="text-sm text-[var(--color-danger)] bg-[var(--color-danger-soft)] rounded-[var(--radius-sm)] px-3 py-2">
            {formError}
          </p>
        )}

        <Button type="submit" fullWidth loading={submitting}>
          Submit complaint
        </Button>
      </form>
    </Screen>
  );
}
