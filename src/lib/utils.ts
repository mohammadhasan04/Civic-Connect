// Bhatkal Civic Connect — Utility Functions (Production)

import { type ClassValue, clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';
import { format, formatDistanceToNow, differenceInHours, differenceInMinutes } from 'date-fns';

// ── Tailwind class merge ───────────────────────────────────────
export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

// ── Sanitize text input ────────────────────────────────────────
export function sanitizeInput(input: string): string {
  return input
    .replace(/<[^>]*>/g, '')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&amp;/g, '&')
    .replace(/javascript:/gi, '')
    .replace(/on\w+\s*=/gi, '')
    .trim();
}

// ── Date formatting ────────────────────────────────────────────
export function formatDate(dateStr: string): string {
  try {
    return format(new Date(dateStr), 'MMM d, yyyy');
  } catch {
    return dateStr;
  }
}

export function formatDateTime(dateStr: string): string {
  try {
    return format(new Date(dateStr), 'MMM d, yyyy h:mm a');
  } catch {
    return dateStr;
  }
}

export function formatRelative(dateStr: string): string {
  try {
    return formatDistanceToNow(new Date(dateStr), { addSuffix: true });
  } catch {
    return dateStr;
  }
}

// ── SLA Countdown ──────────────────────────────────────────────
export function getSLACountdown(deadline: string): {
  text: string;
  color: 'green' | 'yellow' | 'red';
  isOverdue: boolean;
} {
  const now = new Date();
  const deadlineDate = new Date(deadline);
  const hoursLeft = differenceInHours(deadlineDate, now);
  const minutesLeft = differenceInMinutes(deadlineDate, now);

  if (minutesLeft <= 0) {
    const overdueHours = Math.abs(hoursLeft);
    const overdueMins = Math.abs(minutesLeft) % 60;
    return { text: `Overdue by ${overdueHours}h ${overdueMins}m`, color: 'red', isOverdue: true };
  }

  if (hoursLeft < 24) {
    const mins = minutesLeft % 60;
    return { text: `${hoursLeft}h ${mins}m remaining`, color: 'yellow', isOverdue: false };
  }

  const days = Math.floor(hoursLeft / 24);
  const hrs = hoursLeft % 24;
  return { text: `${days}d ${hrs}h remaining`, color: 'green', isOverdue: false };
}

// ── File validation ────────────────────────────────────────────
export function validateImageFile(file: File): string | null {
  const allowedTypes = ['image/jpeg', 'image/png', 'image/webp'];
  const maxSize = 5 * 1024 * 1024;

  if (!allowedTypes.includes(file.type)) {
    return 'Only JPG, PNG, and WebP images are allowed';
  }
  if (file.size > maxSize) {
    return 'Image must be less than 5MB';
  }
  // Check for suspicious filenames
  if (/[<>:"/\\|?*]/.test(file.name)) {
    return 'Invalid file name';
  }
  return null;
}

// ── File to Base64 ─────────────────────────────────────────────
export function fileToBase64(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const result = reader.result as string;
      // Strip data URL prefix to get raw base64
      const base64 = result.split(',')[1];
      resolve(base64);
    };
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

// ── Formatters ─────────────────────────────────────────────────
export function formatCategory(category: string): string {
  return category
    .split('_')
    .map(word => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ');
}

export function formatStatus(status: string): string {
  return status
    .split('_')
    .map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
    .join(' ');
}

export function truncateText(text: string, maxLength: number): string {
  if (text.length <= maxLength) return text;
  return text.slice(0, maxLength) + '...';
}

// ── Clipboard ──────────────────────────────────────────────────
export async function copyToClipboard(text: string): Promise<boolean> {
  try {
    await navigator.clipboard.writeText(text);
    return true;
  } catch {
    return false;
  }
}

// ── Debounce ───────────────────────────────────────────────────
export function debounce<T extends (...args: unknown[]) => unknown>(fn: T, delay: number) {
  let timer: NodeJS.Timeout;
  return (...args: Parameters<T>) => {
    clearTimeout(timer);
    timer = setTimeout(() => fn(...args), delay);
  };
}

// ── Coordinate privacy ────────────────────────────────────────
export function roundCoordinates(lat: number, lng: number): { lat: number; lng: number } {
  const offset = () => (Math.random() - 0.5) * 0.0036;
  return {
    lat: Math.round((lat + offset()) * 1000) / 1000,
    lng: Math.round((lng + offset()) * 1000) / 1000,
  };
}

// ── CSV Export ─────────────────────────────────────────────────
export function exportToCSV(data: Record<string, unknown>[], filename: string) {
  if (data.length === 0) return;
  const headers = Object.keys(data[0]);
  const rows = data.map(row =>
    headers.map(h => {
      const val = String(row[h] ?? '');
      return val.includes(',') ? `"${val}"` : val;
    }).join(',')
  );
  const csv = [headers.join(','), ...rows].join('\n');
  const blob = new Blob([csv], { type: 'text/csv' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `${filename}.csv`;
  a.click();
  URL.revokeObjectURL(url);
}

// ── Role permission checks ────────────────────────────────────
export function canManageUser(currentRole: string, targetRole: string): boolean {
  if (currentRole === 'super_admin') return true;
  if (currentRole === 'taluk_admin') {
    return ['dept_staff', 'ward_supervisor'].includes(targetRole);
  }
  return false;
}

export function canToggleUserStatus(currentRole: string, targetRole: string): boolean {
  if (currentRole === 'super_admin') return true;
  if (currentRole === 'taluk_admin') {
    // TA can NOT activate/deactivate citizens
    return ['dept_staff', 'ward_supervisor'].includes(targetRole);
  }
  return false;
}

// ── Phone validation (Indian format) ─────────────────────────
/**
 * Validates an Indian phone number.
 * Accepts: +91XXXXXXXXXX, +91 XXXXXXXXXX, 91XXXXXXXXXX, 0XXXXXXXXXX, XXXXXXXXXX
 * The core number must be exactly 10 digits starting with 6-9.
 */
export function validatePhone(phone: string): { valid: boolean; error: string | null; formatted: string } {
  if (!phone || phone.trim() === '') {
    return { valid: true, error: null, formatted: '' }; // Phone is optional
  }

  // Strip spaces, dashes, parentheses
  const cleaned = phone.replace(/[\s\-()]/g, '');

  // Extract the 10-digit number
  let digits = cleaned;
  if (digits.startsWith('+91')) {
    digits = digits.slice(3);
  } else if (digits.startsWith('91') && digits.length === 12) {
    digits = digits.slice(2);
  } else if (digits.startsWith('0') && digits.length === 11) {
    digits = digits.slice(1);
  }

  // Must be exactly 10 digits
  if (!/^\d{10}$/.test(digits)) {
    return { valid: false, error: 'Phone number must be exactly 10 digits', formatted: phone };
  }

  // Must start with 6, 7, 8, or 9 (valid Indian mobile)
  if (!/^[6-9]/.test(digits)) {
    return { valid: false, error: 'Phone number must start with 6, 7, 8, or 9', formatted: phone };
  }

  return { valid: true, error: null, formatted: `+91${digits}` };
}

/**
 * Formats a raw phone input into the display format: +91 XXXXX XXXXX
 */
export function formatPhoneDisplay(phone: string): string {
  const result = validatePhone(phone);
  if (!result.valid || !result.formatted) return phone;
  const digits = result.formatted.replace('+91', '');
  return `+91 ${digits.slice(0, 5)} ${digits.slice(5)}`;
}

// ── Email validation ──────────────────────────────────────────
export function validateEmail(email: string): { valid: boolean; error: string | null } {
  if (!email || email.trim() === '') {
    return { valid: false, error: 'Email is required' };
  }
  const trimmed = email.trim().toLowerCase();
  // RFC 5322 simplified pattern
  const emailRegex = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;
  if (!emailRegex.test(trimmed)) {
    return { valid: false, error: 'Please enter a valid email address' };
  }
  return { valid: true, error: null };
}

// ── Name validation ───────────────────────────────────────────
export function validateName(name: string): { valid: boolean; error: string | null } {
  if (!name || name.trim() === '') {
    return { valid: false, error: 'Full name is required' };
  }
  const trimmed = name.trim();
  if (trimmed.length < 2) {
    return { valid: false, error: 'Name must be at least 2 characters' };
  }
  if (trimmed.length > 100) {
    return { valid: false, error: 'Name must be less than 100 characters' };
  }
  // Allow letters (Latin + extended Unicode), spaces, dots, hyphens, apostrophes
  if (!/^[a-zA-Z\u00C0-\u024F\u0900-\u097F\u0C80-\u0CFF\s.'-]+$/.test(trimmed)) {
    return { valid: false, error: 'Name can only contain letters, spaces, dots, hyphens, and apostrophes' };
  }
  return { valid: true, error: null };
}

// ── Password validation ──────────────────────────────────────
export function validatePassword(password: string): { valid: boolean; error: string | null } {
  if (!password) {
    return { valid: false, error: 'Password is required' };
  }
  if (password.length < 8) {
    return { valid: false, error: 'Password must be at least 8 characters' };
  }
  if (password.length > 128) {
    return { valid: false, error: 'Password must be less than 128 characters' };
  }
  return { valid: true, error: null };
}
