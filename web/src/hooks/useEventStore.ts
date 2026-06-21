import { useStore } from '../stores/useStore';
import { useMemo } from 'react';
import type { EventRecord } from '../types';

export function useEventLog() {
  const events = useStore((s) => s.events);
  const logOpen = useStore((s) => s.view.logOpen);
  const eventPage = useStore((s) => s.eventPage);
  const eventFilter = useStore((s) => s.eventFilter);
  const loadMoreEvents = useStore((s) => s.loadMoreEvents);
  const setEventFilter = useStore((s) => s.setEventFilter);
  const toggleLog = useStore((s) => s.toggleLog);
  const EVENT_PAGE_SIZE = useStore((s) => s.EVENT_PAGE_SIZE);

  const filtered = useMemo(() => {
    if (!eventFilter) return events;
    const q = eventFilter.toLowerCase();
    return events.filter(
      (e: EventRecord) =>
        e.type.toLowerCase().includes(q) ||
        e.title.toLowerCase().includes(q) ||
        (e.content || '').toLowerCase().includes(q),
    );
  }, [events, eventFilter]);

  const visible = filtered.slice(0, eventPage * EVENT_PAGE_SIZE);
  const remaining = filtered.length - visible.length;

  return {
    events,
    logOpen,
    eventPage,
    eventFilter,
    loadMoreEvents,
    setEventFilter,
    toggleLog,
    EVENT_PAGE_SIZE,
    filtered,
    visible,
    remaining,
  };
}
