'use client';

import { createBrowserSupabaseClient } from '@/lib/supabase/client';

import { useState, useRef, useEffect } from 'react';
import { Search, X, Loader2, Tag } from 'lucide-react';
import { STATUS_CONFIG } from '@/lib/constants';
import { Complaint, ComplaintStatus } from '@/lib/types';
import Link from 'next/link';

export function SearchBar() {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<Complaint[]>([]);
  const [searching, setSearching] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key === 'k') {
        e.preventDefault();
        setOpen(true);
        setTimeout(() => inputRef.current?.focus(), 100);
      }
      if (e.key === 'Escape') setOpen(false);
    };
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, []);

  // Search from Supabase
  useEffect(() => {
    if (query.length < 2) { setResults([]); return; }

    const timer = setTimeout(async () => {
      setSearching(true);
      try {
        const supabase = createBrowserSupabaseClient();

        const { data } = await supabase
          .from('complaints')
          .select('*, category:categories(*)')
          .or(`title.ilike.%${query}%,ticket_id.ilike.%${query}%,location_address.ilike.%${query}%`)
          .limit(5);

        setResults((data || []) as Complaint[]);
      } catch {
        setResults([]);
      } finally {
        setSearching(false);
      }
    }, 300);

    return () => clearTimeout(timer);
  }, [query]);

  return (
    <div className="relative" ref={ref}>
      <button
        onClick={() => { setOpen(true); setTimeout(() => inputRef.current?.focus(), 100); }}
        className="flex items-center gap-2 px-3 py-2 rounded-lg border border-[var(--glass-border)] text-sm text-[var(--text-muted)] hover:border-[var(--accent)] transition-colors min-h-[40px] w-full bg-transparent"
      >
        <Search className="w-4 h-4" />
        <span className="flex-1 text-left">Search complaints...</span>
        <kbd className="hidden sm:inline-flex items-center px-1.5 py-0.5 bg-[var(--glass-bg)] rounded text-[10px] font-mono text-[var(--text-muted)]">⌘K</kbd>
      </button>

      {open && (
        <div className="fixed inset-0 z-50 flex items-start justify-center pt-[15vh] bg-[var(--overlay)]" onClick={() => setOpen(false)}>
          <div className="w-full max-w-lg mx-4 glass-card overflow-hidden" onClick={e => e.stopPropagation()}>
            <div className="flex items-center gap-3 px-4 py-3 border-b border-[var(--glass-border)]">
              <Search className="w-5 h-5 text-[var(--text-muted)]" />
              <input
                ref={inputRef}
                type="text"
                value={query}
                onChange={e => setQuery(e.target.value)}
                placeholder="Search by ticket ID, title, address..."
                className="flex-1 text-sm bg-transparent outline-none placeholder:text-[var(--text-muted)] text-[var(--text-primary)]"
                autoFocus
              />
              {searching && <Loader2 className="w-4 h-4 animate-spin text-[var(--accent)]" />}
              {query && <button onClick={() => setQuery('')} className="p-1 text-[var(--text-muted)] hover:text-[var(--text-primary)]"><X className="w-4 h-4" /></button>}
              <kbd className="text-[10px] px-1.5 py-0.5 border border-[var(--glass-border)] rounded font-mono text-[var(--text-muted)]">ESC</kbd>
            </div>

            {query.length >= 2 && (
              <div className="max-h-[300px] overflow-y-auto">
                {results.length > 0 ? results.map(c => {
                  const categoryColor = c.category?.color || '#6B7280';
                  const categoryName = c.category?.name_en || 'Unknown';
                  const statusConfig = STATUS_CONFIG[c.status as ComplaintStatus];
                  return (
                    <Link
                      key={c.id}
                      href={`/citizen/complaints/${c.id}`}
                      className="flex items-center gap-3 px-4 py-3 hover:bg-[var(--glass-bg-hover)] transition-colors border-b border-[var(--glass-border-light)] last:border-0"
                      onClick={() => setOpen(false)}
                    >
                      <div className="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0" style={{ backgroundColor: categoryColor + '15', color: categoryColor }}>
                        <Tag className="w-4 h-4" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium truncate text-[var(--text-primary)]">{c.title}</p>
                        <div className="flex items-center gap-2 mt-0.5">
                          <span className="text-xs font-mono text-[var(--text-muted)]">{c.ticket_id}</span>
                          <span className="text-[10px] font-semibold px-1.5 py-0.5 rounded" style={{ backgroundColor: categoryColor + '15', color: categoryColor }}>{categoryName}</span>
                          {statusConfig && <span className={`badge ${statusConfig.bg}`}>{statusConfig.label}</span>}
                        </div>
                      </div>
                    </Link>
                  );
                }) : (
                  <div className="px-4 py-8 text-center">
                    <p className="text-sm text-[var(--text-muted)]">No complaints found for &ldquo;{query}&rdquo;</p>
                  </div>
                )}
              </div>
            )}

            {query.length < 2 && (
              <div className="px-4 py-6 text-center">
                <p className="text-xs text-[var(--text-muted)]">Type at least 2 characters to search</p>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
