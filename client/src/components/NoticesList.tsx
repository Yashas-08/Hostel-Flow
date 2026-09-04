import { useNavigate } from 'react-router-dom';
import { Card, StatusBadge, noticePriorityKind, noticePriorityLabel } from './primitives';
import type { Notice } from '../types';

function formatDate(d: string) {
  return new Date(d).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' });
}

export default function NoticesList({ notices, limit }: { notices: Notice[]; limit?: number }) {
  const navigate = useNavigate();
  const shown = limit ? notices.slice(0, limit) : notices;

  return (
    <div className="space-y-2.5">
      {shown.map((notice) => (
        <button
          key={notice.id}
          type="button"
          onClick={() => navigate(`/student/notices/${notice.id}`)}
          className="w-full text-left"
        >
          <Card accentColor={notice.priority !== 'normal' ? 'var(--color-warning)' : 'var(--color-border-strong)'} className="pl-5">
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <p className="font-semibold text-sm text-[var(--color-ink)] leading-snug">{notice.title}</p>
                <p className="text-xs text-[var(--color-ink-muted)] mt-1">
                  {notice.category} · {formatDate(notice.createdAt)}
                </p>
              </div>
              <StatusBadge kind={noticePriorityKind(notice.priority)}>
                {noticePriorityLabel(notice.priority)}
              </StatusBadge>
            </div>
          </Card>
        </button>
      ))}
    </div>
  );
}
