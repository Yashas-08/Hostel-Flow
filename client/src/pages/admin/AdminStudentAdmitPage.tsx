import { useRef, useState, type FormEvent } from 'react';
import { useNavigate } from 'react-router-dom';
import { api, ApiError } from '../../lib/api';
import { useAuth } from '../../context/AuthContext';
import AdminHeader from '../../components/admin/AdminHeader';
import AdminScreen from '../../components/admin/AdminScreen';
import { Avatar, Card, FieldWrap, Input, Select } from '../../components/primitives';
import Button from '../../components/Button';
import type { AdmissionResult, Gender } from '../../types';

const MAX_AVATAR_BYTES = 1.3 * 1024 * 1024;

function SectionTitle({ children }: { children: React.ReactNode }) {
  return <p className="text-xs font-semibold text-[var(--color-ink-muted)] uppercase tracking-wide mb-3">{children}</p>;
}

export default function AdminStudentAdmitPage() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Personal information
  const [fullName, setFullName] = useState('');
  const [dateOfBirth, setDateOfBirth] = useState('');
  const [gender, setGender] = useState<Gender | ''>('');
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');
  const [avatarPreview, setAvatarPreview] = useState<string | null>(null);

  // Academic information
  const [studentCode, setStudentCode] = useState('');
  const [course, setCourse] = useState('');
  const [department, setDepartment] = useState('');
  const [year, setYear] = useState('');

  // Parent / guardian details
  const [fatherName, setFatherName] = useState('');
  const [fatherPhone, setFatherPhone] = useState('');
  const [motherName, setMotherName] = useState('');
  const [motherPhone, setMotherPhone] = useState('');
  const [relationship, setRelationship] = useState('');

  // Hostel information
  const [roomNumber, setRoomNumber] = useState('');

  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [formError, setFormError] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [result, setResult] = useState<AdmissionResult | null>(null);
  const [copied, setCopied] = useState(false);

  const block = gender === 'male' ? 'R Block' : gender === 'female' ? 'M Block' : '';

  function handleImageChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      setFieldErrors((prev) => ({ ...prev, avatarUrl: 'Please choose an image file' }));
      return;
    }
    if (file.size > MAX_AVATAR_BYTES) {
      setFieldErrors((prev) => ({ ...prev, avatarUrl: 'Photo must be under 1.3MB' }));
      return;
    }
    setFieldErrors((prev) => {
      const rest = { ...prev };
      delete rest.avatarUrl;
      return rest;
    });

    const reader = new FileReader();
    reader.onload = () => setAvatarPreview(reader.result as string);
    reader.readAsDataURL(file);
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setFormError('');
    setFieldErrors({});
    setSubmitting(true);

    try {
      const created = await api.post<AdmissionResult>('/admin/students/admit', {
        fullName: fullName.trim(),
        dateOfBirth,
        gender: gender || undefined,
        phone: phone.trim(),
        email: email.trim(),
        avatarUrl: avatarPreview || undefined,
        studentCode: studentCode.trim(),
        course: course.trim(),
        department: department.trim(),
        year: year ? Number(year) : undefined,
        block: block || undefined,
        roomNumber: roomNumber.trim(),
        guardian: {
          fatherName: fatherName.trim(),
          fatherPhone: fatherPhone.trim(),
          motherName: motherName.trim(),
          motherPhone: motherPhone.trim(),
          relationship: relationship.trim(),
        },
      });
      setResult(created);
    } catch (err) {
      if (err instanceof ApiError) {
        if (err.fields) setFieldErrors(err.fields);
        else setFormError(err.message);
      } else {
        setFormError('Could not admit this student. Please try again.');
      }
    } finally {
      setSubmitting(false);
    }
  }

  async function copyCredentials() {
    if (!result) return;
    const text = [
      `Student: ${result.fullName}`,
      `Student ID: ${result.studentCode}`,
      `Email: ${result.email}`,
      `Temporary password: ${result.tempPassword}`,
      `Block: ${result.block}`,
      `Room: ${result.roomNumber}`,
    ].join('\n');
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      setFormError('Could not copy to clipboard. Please copy the details manually.');
    }
  }

  if (result) {
    return (
      <>
        <AdminHeader name={user?.fullName ?? ''} title="Student admitted" />
        <AdminScreen>
          <div className="lg:max-w-xl">
            <div className="pb-5 flex items-center gap-2 text-[var(--color-success)]">
              <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><path d="M20 6 9 17l-5-5" /></svg>
              <h1 className="font-display font-bold text-xl text-[var(--color-ink)]">Admission successful</h1>
            </div>

            <Card>
              <dl className="space-y-2.5 text-sm">
                <div className="flex justify-between"><dt className="text-[var(--color-ink-muted)]">Student name</dt><dd className="font-semibold">{result.fullName}</dd></div>
                <div className="flex justify-between"><dt className="text-[var(--color-ink-muted)]">Student ID</dt><dd className="font-mono-data">{result.studentCode}</dd></div>
                <div className="flex justify-between"><dt className="text-[var(--color-ink-muted)]">Email</dt><dd className="text-right">{result.email}</dd></div>
                <div className="flex justify-between"><dt className="text-[var(--color-ink-muted)]">Temporary password</dt><dd className="font-mono-data font-semibold">{result.tempPassword}</dd></div>
                <div className="flex justify-between"><dt className="text-[var(--color-ink-muted)]">Block</dt><dd>{result.block}</dd></div>
                <div className="flex justify-between"><dt className="text-[var(--color-ink-muted)]">Room</dt><dd>{result.roomNumber}</dd></div>
              </dl>
            </Card>

            <p className="text-xs text-[var(--color-ink-muted)] mt-3">
              This is the only time the temporary password is shown. Share it with the student securely.
            </p>

            <div className="flex flex-col gap-2.5 mt-5">
              <Button onClick={copyCredentials}>{copied ? 'Copied!' : 'Copy credentials'}</Button>
              <Button variant="ghost" onClick={() => navigate('/admin/students')}>Back to students</Button>
            </div>
          </div>
        </AdminScreen>
      </>
    );
  }

  return (
    <>
      <AdminHeader name={user?.fullName ?? ''} title="Admit student" />
      <AdminScreen>
        <div className="lg:max-w-2xl">
          <div className="pb-5 flex items-center gap-3 lg:hidden">
            <button onClick={() => navigate(-1)} aria-label="Back" className="h-9 w-9 flex items-center justify-center rounded-full border border-[var(--color-border)]">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M15 18l-6-6 6-6" /></svg>
            </button>
            <h1 className="font-display font-bold text-lg text-[var(--color-ink)]">Admit student</h1>
          </div>

          <form onSubmit={handleSubmit} className="space-y-6" noValidate>
            <div>
              <SectionTitle>Personal information</SectionTitle>
              <div className="space-y-4">
                <div className="flex items-center gap-4">
                  <Avatar name={fullName || '?'} size={64} src={avatarPreview} />
                  <div>
                    <button type="button" onClick={() => fileInputRef.current?.click()} className="text-sm font-semibold text-[var(--color-primary)]">
                      {avatarPreview ? 'Change photo' : 'Add photo (optional)'}
                    </button>
                    <input ref={fileInputRef} type="file" accept="image/*" onChange={handleImageChange} className="hidden" />
                    {fieldErrors.avatarUrl && <p className="text-xs text-[var(--color-danger)] mt-1">{fieldErrors.avatarUrl}</p>}
                  </div>
                </div>

                <FieldWrap label="Full name" error={fieldErrors.fullName}>
                  <Input value={fullName} onChange={(e) => setFullName(e.target.value)} error={fieldErrors.fullName} />
                </FieldWrap>

                <div className="grid grid-cols-2 gap-3">
                  <FieldWrap label="Date of birth" error={fieldErrors.dateOfBirth}>
                    <Input type="date" value={dateOfBirth} onChange={(e) => setDateOfBirth(e.target.value)} error={fieldErrors.dateOfBirth} />
                  </FieldWrap>
                  <FieldWrap label="Gender" error={fieldErrors.gender}>
                    <Select value={gender} onChange={(e) => setGender(e.target.value as Gender)} error={fieldErrors.gender}>
                      <option value="">Select gender</option>
                      <option value="male">Male</option>
                      <option value="female">Female</option>
                    </Select>
                  </FieldWrap>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <FieldWrap label="Phone number" error={fieldErrors.phone}>
                    <Input type="tel" value={phone} onChange={(e) => setPhone(e.target.value)} error={fieldErrors.phone} />
                  </FieldWrap>
                  <FieldWrap label="Email" error={fieldErrors.email}>
                    <Input type="email" value={email} onChange={(e) => setEmail(e.target.value)} error={fieldErrors.email} />
                  </FieldWrap>
                </div>
              </div>
            </div>

            <div>
              <SectionTitle>Academic information</SectionTitle>
              <div className="space-y-4">
                <FieldWrap label="Student ID / admission number" error={fieldErrors.studentCode}>
                  <Input value={studentCode} onChange={(e) => setStudentCode(e.target.value)} error={fieldErrors.studentCode} />
                </FieldWrap>
                <div className="grid grid-cols-2 gap-3">
                  <FieldWrap label="Course" error={fieldErrors.course}>
                    <Input value={course} onChange={(e) => setCourse(e.target.value)} error={fieldErrors.course} />
                  </FieldWrap>
                  <FieldWrap label="Department" error={fieldErrors.department}>
                    <Input value={department} onChange={(e) => setDepartment(e.target.value)} error={fieldErrors.department} />
                  </FieldWrap>
                </div>
                <FieldWrap label="Year" error={fieldErrors.year}>
                  <Input type="number" min={1} max={8} value={year} onChange={(e) => setYear(e.target.value)} error={fieldErrors.year} />
                </FieldWrap>
              </div>
            </div>

            <div>
              <SectionTitle>Parent / guardian details</SectionTitle>
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-3">
                  <FieldWrap label="Father's / guardian's name" error={fieldErrors.fatherName}>
                    <Input value={fatherName} onChange={(e) => setFatherName(e.target.value)} error={fieldErrors.fatherName} />
                  </FieldWrap>
                  <FieldWrap label="Father's / guardian's phone" error={fieldErrors.fatherPhone}>
                    <Input type="tel" value={fatherPhone} onChange={(e) => setFatherPhone(e.target.value)} error={fieldErrors.fatherPhone} />
                  </FieldWrap>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <FieldWrap label="Mother's / guardian's name" error={fieldErrors.motherName}>
                    <Input value={motherName} onChange={(e) => setMotherName(e.target.value)} error={fieldErrors.motherName} />
                  </FieldWrap>
                  <FieldWrap label="Mother's / guardian's phone" error={fieldErrors.motherPhone}>
                    <Input type="tel" value={motherPhone} onChange={(e) => setMotherPhone(e.target.value)} error={fieldErrors.motherPhone} />
                  </FieldWrap>
                </div>
                <FieldWrap label="Relationship with student" error={fieldErrors.relationship}>
                  <Input placeholder="e.g. Father, Mother, Uncle, Legal guardian" value={relationship} onChange={(e) => setRelationship(e.target.value)} error={fieldErrors.relationship} />
                </FieldWrap>
              </div>
            </div>

            <div>
              <SectionTitle>Hostel information</SectionTitle>
              <div className="space-y-4">
                <FieldWrap label="Block" error={fieldErrors.block}>
                  <Select value={block} disabled className="disabled:opacity-100 disabled:bg-[var(--color-bg)]">
                    {!gender && <option value="">Select gender first</option>}
                    {gender === 'male' && <option value="R Block">R Block</option>}
                    {gender === 'female' && <option value="M Block">M Block</option>}
                  </Select>
                  <p className="text-xs text-[var(--color-ink-muted)] mt-1.5">
                    Boys are placed in R Block, girls in M Block — set automatically from gender.
                  </p>
                </FieldWrap>

                <FieldWrap label="Room number" error={fieldErrors.roomNumber}>
                  <Input
                    placeholder="e.g. 101"
                    value={roomNumber}
                    onChange={(e) => setRoomNumber(e.target.value)}
                    error={fieldErrors.roomNumber}
                  />
                </FieldWrap>
              </div>
            </div>

            {formError && (
              <p role="alert" className="text-sm text-[var(--color-danger)] bg-[var(--color-danger-soft)] rounded-[var(--radius-sm)] px-3 py-2">
                {formError}
              </p>
            )}

            <Button type="submit" fullWidth loading={submitting}>
              Admit student
            </Button>
          </form>
        </div>
      </AdminScreen>
    </>
  );
}
