import { Card } from './primitives';
import type { RoomInfo } from '../types';

export default function RoomCard({ room }: { room: RoomInfo }) {
  return (
    <Card accentColor="var(--color-primary)" className="pl-5">
      <div className="flex items-start justify-between mb-3">
        <div>
          <p className="text-xs font-medium text-[var(--color-ink-muted)] uppercase tracking-wide">Your room</p>
          <p className="font-display font-bold text-2xl text-[var(--color-ink)] mt-0.5">
            {room.roomNumber}
            <span className="text-base font-medium text-[var(--color-ink-muted)] font-mono-data"> · Bed {room.bedNumber}</span>
          </p>
        </div>
        <div className="text-right shrink-0">
          <p className="text-xs text-[var(--color-ink-muted)]">{room.block}</p>
          <p className="text-xs text-[var(--color-ink-muted)]">Floor {room.floor}</p>
        </div>
      </div>

      {room.roommates.length > 0 && (
        <div className="pt-3 border-t border-[var(--color-border)]">
          <p className="text-xs font-medium text-[var(--color-ink-muted)] mb-1.5">Roommates</p>
          <div className="flex flex-wrap gap-1.5">
            {room.roommates.map((rm) => (
              <span
                key={rm.fullName}
                className="text-xs bg-[var(--color-primary-soft)] text-[var(--color-primary)] rounded-full px-2.5 py-1 font-medium"
              >
                {rm.fullName} · {rm.bedNumber}
              </span>
            ))}
          </div>
        </div>
      )}
    </Card>
  );
}
