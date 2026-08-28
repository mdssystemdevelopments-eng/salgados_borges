import type { CmsOrderSettings } from "@/lib/cms/types";

export function formatIsoDate(d: Date): string {
  return d.toISOString().slice(0, 10);
}

export function parseIsoDate(value: string): Date | null {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return null;
  const d = new Date(`${value}T12:00:00`);
  return Number.isNaN(d.getTime()) ? null : d;
}

export function isDateAvailable(value: string, schedule: CmsOrderSettings["schedule"]): boolean {
  const date = parseIsoDate(value);
  if (!date) return false;
  if (schedule.blockedDates.includes(value)) return false;
  if (!schedule.availableWeekdays.includes(date.getDay())) return false;

  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const target = new Date(date);
  target.setHours(0, 0, 0, 0);
  const diffDays = Math.round((target.getTime() - today.getTime()) / 86400000);

  if (diffDays < 0) return false;
  if (diffDays === 0 && !schedule.allowSameDay) return false;
  if (diffDays < schedule.minLeadDays) return false;
  return true;
}

export function availableTimeSlots(schedule: CmsOrderSettings["schedule"]) {
  return schedule.timeSlots.filter(
    (slot) => slot.enabled && !schedule.blockedTimeSlotIds.includes(slot.id),
  );
}

export function minSelectableDate(schedule: CmsOrderSettings["schedule"]): string {
  const d = new Date();
  if (!schedule.allowSameDay) {
    d.setDate(d.getDate() + Math.max(1, schedule.minLeadDays));
  } else {
    d.setDate(d.getDate() + schedule.minLeadDays);
  }
  return formatIsoDate(d);
}
