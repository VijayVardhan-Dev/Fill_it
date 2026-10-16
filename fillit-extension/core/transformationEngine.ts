import type { FieldContext, ProfileField } from './types';

function prompt(context: FieldContext): string {
  return [...context.explicitText, ...context.nearbyText, ...context.sectionText].join(' ').toLowerCase();
}

function dateDisplay(value: string, format: 'dmy' | 'mdy'): string {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value);
  if (!match) return value;
  const [, year, month, day] = match;
  return format === 'dmy' ? `${day}/${month}/${year}` : `${month}/${day}/${year}`;
}

export function transformValue(key: ProfileField | string, raw: string, context: FieldContext): string {
  const text = prompt(context);
  if (/phone|mobile|telephone|tel/.test(key) || key === 'phoneE164' || key === 'phoneNational') {
    const digits = raw.replace(/[^\d]/g, '');
    if (key === 'phoneE164' || /international|country code|\+\d/.test(text)) return `+${digits}`;
    return /digits only|numbers only/.test(text) ? digits.slice(-10) : raw;
  }
  if (key === 'cgpa' || key === 'gpa') {
    const numeric = Number.parseFloat(raw);
    if (!Number.isFinite(numeric)) return raw;
    return /decimal|0\.00|two decimal/.test(text) && context.fieldType !== 'number'
      ? numeric.toFixed(2)
      : String(numeric);
  }
  if (/salary|ctc|compensation|pay/.test(key) || /salary|ctc|compensation/.test(text)) {
    const numeric = Number.parseFloat(raw.replace(/[^\d.]/g, ''));
    if (!Number.isFinite(numeric)) return raw;
    if (/annual|yearly|per annum|lpa/.test(text)) return String(numeric);
    return raw;
  }
  if (/date/i.test(key)) {
    if (context.fieldType === 'date') return raw;
    if (/dd\s*[/.-]\s*mm|day.?month.?year|dmy/.test(text)) return dateDisplay(raw, 'dmy');
    if (/mm\s*[/.-]\s*dd|month.?day.?year|mdy/.test(text)) return dateDisplay(raw, 'mdy');
  }
  if (context.fieldType === 'number') {
    const numeric = Number.parseFloat(raw);
    return Number.isFinite(numeric) ? String(numeric) : raw;
  }
  return raw;
}

export function sanitizeLearnedValue(value: string): string {
  return value.replace(/\s+/g, ' ').replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F]/g, '').trim().slice(0, 1000);
}
