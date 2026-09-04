import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import QRCode from 'qrcode';
import { api, ApiError } from '../../lib/api';
import Screen from '../../components/Screen';
import { Card, StatusBadge } from '../../components/primitives';
import { LoadingState, ErrorState } from '../../components/States';
import type { MealBookingDetail } from '../../types';

function formatDate(d: string) {
  return new Date(d).toLocaleDateString('en-IN', { day: 'numeric', month: 'long', year: 'numeric' });
}

export default function MealQrPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [booking, setBooking] = useState<MealBookingDetail | null>(null);
  const [qrImage, setQrImage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  async function load() {
    setLoading(true);
    setError(null);
    try {
      const data = await api.get<MealBookingDetail>(`/meals/${id}`);
      setBooking(data);
      const dataUrl = await QRCode.toDataURL(data.qrCode, { margin: 1, width: 260 });
      setQrImage(dataUrl);
    } catch (e) {
      setError(e instanceof ApiError ? e.message : 'Could not load this booking.');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  return (
    <Screen>
      <div className="pt-[calc(env(safe-area-inset-top)+18px)] pb-5 flex items-center gap-3">
        <button onClick={() => navigate('/student/meals')} aria-label="Back to meals" className="h-9 w-9 flex items-center justify-center rounded-full border border-[var(--color-border)]">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M15 18l-6-6 6-6" /></svg>
        </button>
        <h1 className="font-display font-bold text-lg text-[var(--color-ink)]">Meal QR</h1>
      </div>

      {loading && <LoadingState label="Loading QR" />}
      {!loading && error && <ErrorState message={error} onRetry={load} />}
      {!loading && !error && booking && (
        <div className="space-y-4">
          <Card className="flex flex-col items-center py-6">
            {qrImage && <img src={qrImage} alt="Meal booking QR code" className="rounded-[var(--radius-md)]" width={260} height={260} />}
            <p className="font-display font-bold text-lg text-[var(--color-ink)] mt-4">{booking.label}</p>
            <p className="text-sm text-[var(--color-ink-muted)]">{formatDate(booking.date)} · {booking.timeLabel}</p>
            <div className="mt-3">
              <StatusBadge kind={booking.status === 'consumed' ? 'success' : booking.status === 'cancelled' ? 'neutral' : 'warning'}>
                {booking.status.charAt(0).toUpperCase() + booking.status.slice(1)}
              </StatusBadge>
            </div>
          </Card>
          <p className="text-xs text-[var(--color-ink-muted)] text-center">
            Show this QR code at the mess entrance to check in for this meal.
          </p>
        </div>
      )}
    </Screen>
  );
}
