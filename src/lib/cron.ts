// Lightweight describer for standard 5-field crontab expressions.
// Validates ranges and names; it does not compute next run times.

export interface CronExplanation {
  minute: string;
  hour: string;
  dayOfMonth: string;
  month: string;
  dayOfWeek: string;
  summary: string;
  notes: string[];
}

type FieldType = 'minute' | 'hour' | 'dom' | 'month' | 'dow';

interface FieldSpec {
  label: string;
  min: number;
  max: number;
  names?: string[];
}

const WEEKDAYS = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
const MONTHS = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];

const FIELDS: Record<FieldType, FieldSpec> = {
  minute: { label: 'minute', min: 0, max: 59 },
  hour: { label: 'hour', min: 0, max: 23 },
  dom: { label: 'day of month', min: 1, max: 31 },
  month: { label: 'month', min: 1, max: 12, names: MONTHS.map((m) => m.slice(0, 3).toUpperCase()) },
  dow: { label: 'day of week', min: 0, max: 7, names: WEEKDAYS.map((d) => d.slice(0, 3).toUpperCase()) },
};

const parseValue = (raw: string, type: FieldType): number => {
  const spec = FIELDS[type];
  let value: number;
  const nameIndex = spec.names?.indexOf(raw.toUpperCase()) ?? -1;
  if (nameIndex >= 0) {
    value = type === 'month' ? nameIndex + 1 : nameIndex;
  } else if (/^\d+$/.test(raw)) {
    value = Number(raw);
  } else {
    throw new Error(`Invalid ${spec.label} value "${raw}".`);
  }
  if (value < spec.min || value > spec.max) {
    throw new Error(`The ${spec.label} value ${value} is outside ${spec.min}-${spec.max}.`);
  }
  return value;
};

const label = (value: number, type: FieldType): string => {
  if (type === 'month') return MONTHS[value - 1];
  if (type === 'dow') return WEEKDAYS[value % 7];
  if (type === 'hour') return String(value).padStart(2, '0');
  return String(value);
};

const unit: Record<FieldType, [string, string]> = {
  minute: ['minute', 'minutes'],
  hour: ['hour', 'hours'],
  dom: ['day', 'days'],
  month: ['month', 'months'],
  dow: ['day of the week', 'days of the week'],
};

const describeItem = (item: string, type: FieldType): string => {
  const [rangePart, stepPart, extra] = item.split('/');
  if (extra !== undefined || rangePart === '') throw new Error(`Invalid ${FIELDS[type].label} segment "${item}".`);

  let step: number | null = null;
  if (stepPart !== undefined) {
    if (!/^\d+$/.test(stepPart) || Number(stepPart) === 0) {
      throw new Error(`Invalid step "/${stepPart}" in the ${FIELDS[type].label} field.`);
    }
    step = Number(stepPart);
  }

  const everyStep = step ? `every ${step} ${unit[type][1]}` : '';

  if (rangePart === '*') {
    return step ? everyStep : `every ${unit[type][0]}`;
  }

  if (rangePart.includes('-')) {
    const [startRaw, endRaw] = rangePart.split('-');
    const start = parseValue(startRaw, type);
    const end = parseValue(endRaw, type);
    if (start > end) throw new Error(`The ${FIELDS[type].label} range ${rangePart} starts after it ends.`);
    const range = `${label(start, type)} through ${label(end, type)}`;
    return step ? `${everyStep} from ${range}` : range;
  }

  const value = parseValue(rangePart, type);
  return step ? `${everyStep} starting at ${label(value, type)}` : label(value, type);
};

const describeField = (field: string, type: FieldType): string => {
  const items = field.split(',');
  if (items.some((item) => item === '')) throw new Error(`Empty list entry in the ${FIELDS[type].label} field.`);
  return items.map((item) => describeItem(item, type)).join(', ');
};

const MACROS: Record<string, string> = {
  '@yearly': '0 0 1 1 *',
  '@annually': '0 0 1 1 *',
  '@monthly': '0 0 1 * *',
  '@weekly': '0 0 * * 0',
  '@daily': '0 0 * * *',
  '@midnight': '0 0 * * *',
  '@hourly': '0 * * * *',
};

export const describeCron = (expression: string): CronExplanation => {
  let cleaned = expression.trim().replace(/\s+/g, ' ');
  cleaned = MACROS[cleaned.toLowerCase()] ?? cleaned;

  const parts = cleaned.split(' ');
  if (parts.length !== 5) {
    throw new Error('A standard cron expression must contain exactly 5 space-separated fields (minute hour day-of-month month day-of-week).');
  }

  const [minF, hourF, domF, monthF, dowF] = parts;
  const minute = describeField(minF, 'minute');
  const hour = describeField(hourF, 'hour');
  const dayOfMonth = describeField(domF, 'dom');
  const month = describeField(monthF, 'month');
  const dayOfWeek = describeField(dowF, 'dow');

  let when: string;
  if (/^\d+$/.test(minF) && /^\d+$/.test(hourF)) {
    when = `at ${hourF.padStart(2, '0')}:${minF.padStart(2, '0')}`;
  } else if (hourF === '*') {
    when = /^\d+$/.test(minF) ? `at minute ${minF} of every hour` : minute;
  } else {
    const minutePart = /^\d+$/.test(minF) ? `at minute ${minF}` : minute;
    when = `${minutePart}, during hour(s) ${hour}`;
  }

  const clauses = [when];
  if (domF !== '*') clauses.push(`on day-of-month ${dayOfMonth}`);
  if (monthF !== '*') clauses.push(`in ${month}`);
  if (dowF !== '*') clauses.push(`on ${dayOfWeek}`);

  const notes: string[] = [];
  if (domF !== '*' && dowF !== '*') {
    notes.push('When both day-of-month and day-of-week are restricted, most cron implementations run when EITHER matches.');
  }

  const summary = `Runs ${clauses.join(', ')}.`;
  return { minute, hour, dayOfMonth, month, dayOfWeek, summary, notes };
};
