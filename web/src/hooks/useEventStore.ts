import { useStore } from "../stores/useStore";

export function useEventStore() {
  const events = useStore((s) => s.events);
  const logOpen = useStore((s) => s.view.logOpen);
  const eventPage = useStore((s) => s.eventPage);
  const eventFilter = useStore((s) => s.eventFilter);
  const loadMoreEvents = useStore((s) => s.loadMoreEvents);
  const setEventFilter = useStore((s) => s.setEventFilter);
  const toggleLog = useStore((s) => s.toggleLog);
  const EVENT_PAGE_SIZE = useStore((s) => s.EVENT_PAGE_SIZE);
  return { events, logOpen, eventPage, eventFilter, loadMoreEvents, setEventFilter, toggleLog, EVENT_PAGE_SIZE };
}