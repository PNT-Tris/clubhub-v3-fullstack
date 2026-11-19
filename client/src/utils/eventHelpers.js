export function hasEventStarted(event) {
  return event?.startAt ? new Date(event.startAt) <= new Date() : false;
}

export function isEventFull(event) {
  return Boolean(event?.capacity) && (event.registrationsCount || 0) >= event.capacity;
}

// Chỉ trả về nhãn khi sự kiện có trạng thái đặc biệt, ngược lại trả null.
// tone: 'approved' | 'pending' | 'rejected' (dùng lại class .status-pill có sẵn)
export function getEventAvailability(event) {
  if (event?.status === 'cancelled') return { label: 'Đã hủy', tone: 'rejected' };
  if (hasEventStarted(event)) return { label: 'Đã diễn ra', tone: 'rejected' };
  if (isEventFull(event)) return { label: 'Đã đủ chỗ', tone: 'pending' };
  return null;
}