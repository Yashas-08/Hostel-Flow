import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { api, ApiError } from '../../lib/api';
import Screen from '../../components/Screen';
import { Card, StatusBadge } from '../../components/primitives';
import { LoadingState, ErrorState } from '../../components/States';
import Button from '../../components/Button';
import type { MealsResponse, MealDay, MealSlot } from '../../types';

function MealCard({ meal, dayLabel, onBook, onViewQr, booking }: {
  meal: MealSlot;
  dayLabel: string;
  onBook: (mealType: MealSlot['mealType']) => void;
  onViewQr: (bookingId: number) => void;
  booking: boolean;
}) {
  return (
    <Card accentColor={meal.booked ? 'var(--color-primary)' : 'var(--color-border-strong)'} className="pl-5">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="font-semibold text-sm text-[var(--color-ink)]">{meal.label}</p>
          <p className="text-xs text-[var(--color-ink-muted)] mt-0.5">{meal.timeLabel}</p>
        </div>
        {meal.booked && meal.status && (
          <StatusBadge kind={meal.status === 'consumed' ? 'success' : meal.status === 'cancelled' ? 'neutral' : 'warning'}>
            {meal.status.charAt(0).toUpperCase() + meal.status.slice(1)}
          </StatusBadge>
        )}
        {!meal.booked && dayLabel === 'Today' && (
          <StatusBadge kind="neutral">Not Booked</StatusBadge>
        )}
      </div>

      <div className="mt-3">
        {meal.booked && meal.bookingId ? (
          <Button size="sm" variant="secondary" onClick={() => onViewQr(meal.bookingId as number)}>
            View QR
          </Button>
        ) : meal.bookable ? (
          <Button size="sm" loading={booking} onClick={() => onBook(meal.mealType)}>
            Book
          </Button>
        ) : dayLabel === 'Today' ? (
          <p className="text-xs text-[var(--color-ink-faint)]">No QR — this meal wasn't booked</p>
        ) : (
          <p className="text-xs text-[var(--color-ink-faint)]">Not bookable</p>
        )}
      </div>
    </Card>
  );
}

export default function MealsPage() {
  const navigate = useNavigate();
  const [data, setData] = useState<MealsResponse | null>(null);
  const [activeDay, setActiveDay] = useState(1); // default to "Today" tab index
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [bookingType, setBookingType] = useState<string | null>(null);
  const [bookError, setBookError] = useState('');

  async function load() {
    setLoading(true);
    setError(null);
    try {
      setData(await api.get<MealsResponse>('/meals'));
    } catch (e) {
      setError(e instanceof ApiError ? e.message : 'Could not load meals.');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
  }, []);

  async function handleBook(mealType: MealSlot['mealType']) {
    setBookingType(mealType);
    setBookError('');
    try {
      await api.post('/meals/book', { mealType });
      await load();
    } catch (e) {
      setBookError(e instanceof ApiError ? e.message : 'Could not book this meal.');
    } finally {
      setBookingType(null);
    }
  }

  const activeDayData: MealDay | undefined = data?.days[activeDay];

  return (
    <Screen>
      <div className="pt-[calc(env(safe-area-inset-top)+18px)] pb-4 flex items-center gap-3">
        <button onClick={() => navigate(-1)} aria-label="Back" className="h-9 w-9 flex items-center justify-center rounded-full border border-[var(--color-border)]">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M15 18l-6-6 6-6" /></svg>
        </button>
        <h1 className="font-display font-bold text-lg text-[var(--color-ink)]">Meals</h1>
      </div>

      {loading && <LoadingState label="Loading meals" />}
      {!loading && error && <ErrorState message={error} onRetry={load} />}
      {!loading && !error && data && (
        <div className="space-y-4">
          <div className="flex gap-2 no-scrollbar overflow-x-auto">
            {data.days.map((day, i) => (
              <button
                key={day.date}
                type="button"
                onClick={() => setActiveDay(i)}
                className={[
                  'px-4 py-2 rounded-full text-sm font-semibold shrink-0 border',
                  i === activeDay
                    ? 'bg-[var(--color-primary)] text-[var(--color-primary-ink)] border-[var(--color-primary)]'
                    : 'bg-[var(--color-surface)] text-[var(--color-ink-muted)] border-[var(--color-border)]',
                ].join(' ')}
              >
                {day.label}
              </button>
            ))}
          </div>

          {activeDayData?.label === 'Tomorrow' && !data.bookingWindowOpen && (
            <p className="text-xs text-[var(--color-ink-muted)] bg-[var(--color-primary-soft)] rounded-[var(--radius-sm)] px-3 py-2">
              Bookings for tomorrow are open from 6:00 AM to 7:00 PM.
            </p>
          )}
          {bookError && (
            <p className="text-sm text-[var(--color-danger)] bg-[var(--color-danger-soft)] rounded-[var(--radius-sm)] px-3 py-2">
              {bookError}
            </p>
          )}

          <div className="space-y-2.5">
            {activeDayData?.meals.map((meal) => (
              <MealCard
                key={meal.mealType}
                meal={meal}
                dayLabel={activeDayData?.label ?? ''}
                booking={bookingType === meal.mealType}
                onBook={handleBook}
                onViewQr={(id) => navigate(`/student/meals/${id}/qr`)}
              />
            ))}
          </div>
        </div>
      )}
    </Screen>
  );
}
