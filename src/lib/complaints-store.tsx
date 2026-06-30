'use client';

import { createBrowserSupabaseClient } from '@/lib/supabase/client';

import { createContext, useContext, useReducer, useCallback, ReactNode, useEffect } from 'react';
import { Complaint, ComplaintStatus } from '@/lib/types';

// State
interface ComplaintsState {
  complaints: Complaint[];
  loading: boolean;
  error: string | null;
  initialized: boolean;
}

// Actions
type Action =
  | { type: 'SET_LOADING'; payload: boolean }
  | { type: 'SET_ERROR'; payload: string | null }
  | { type: 'SET_COMPLAINTS'; payload: Complaint[] }
  | { type: 'ADD_COMPLAINT'; payload: Complaint }
  | { type: 'UPDATE_COMPLAINT'; payload: { id: string; updates: Partial<Complaint> } }
  | { type: 'REMOVE_COMPLAINT'; payload: string };

function reducer(state: ComplaintsState, action: Action): ComplaintsState {
  switch (action.type) {
    case 'SET_LOADING':
      return { ...state, loading: action.payload };
    case 'SET_ERROR':
      return { ...state, error: action.payload, loading: false };
    case 'SET_COMPLAINTS':
      return { ...state, complaints: action.payload, loading: false, initialized: true };
    case 'ADD_COMPLAINT':
      return { ...state, complaints: [action.payload, ...state.complaints] };
    case 'UPDATE_COMPLAINT':
      return {
        ...state,
        complaints: state.complaints.map(c =>
          c.id === action.payload.id ? { ...c, ...action.payload.updates } : c
        ),
      };
    case 'REMOVE_COMPLAINT':
      return { ...state, complaints: state.complaints.filter(c => c.id !== action.payload) };
    default:
      return state;
  }
}

// Context
interface ComplaintsContextType {
  state: ComplaintsState;
  fetchComplaints: (citizenId?: string) => Promise<void>;
  addComplaint: (complaint: Complaint) => void;
  updateStatus: (id: string, status: ComplaintStatus) => void;
  removeComplaint: (id: string) => void;
}

const ComplaintsContext = createContext<ComplaintsContextType | null>(null);

// Provider
export function ComplaintsProvider({ children }: { children: ReactNode }) {
  const [state, dispatch] = useReducer(reducer, {
    complaints: [],
    loading: false,
    error: null,
    initialized: false,
  });

  const fetchComplaints = useCallback(async (citizenId?: string) => {
    dispatch({ type: 'SET_LOADING', payload: true });
    try {
      const supabase = createBrowserSupabaseClient();

      let query = supabase
        .from('complaints')
        .select('*, ward:wards(*), department:departments(*)')
        .order('created_at', { ascending: false });

      if (citizenId) {
        query = query.eq('citizen_id', citizenId);
      }

      const { data, error } = await query;

      if (error) {
        dispatch({ type: 'SET_ERROR', payload: error.message });
        return;
      }

      dispatch({ type: 'SET_COMPLAINTS', payload: (data || []) as Complaint[] });
    } catch (err) {
      dispatch({ type: 'SET_ERROR', payload: err instanceof Error ? err.message : 'Failed to fetch complaints' });
    }
  }, []);

  const addComplaint = useCallback((complaint: Complaint) => {
    dispatch({ type: 'ADD_COMPLAINT', payload: complaint });
  }, []);

  const updateStatus = useCallback((id: string, status: ComplaintStatus) => {
    const updates: Partial<Complaint> = { status };
    if (status === 'RESOLVED') updates.resolved_at = new Date().toISOString();
    if (status === 'CLOSED') updates.closed_at = new Date().toISOString();
    dispatch({ type: 'UPDATE_COMPLAINT', payload: { id, updates } });
  }, []);

  const removeComplaint = useCallback((id: string) => {
    dispatch({ type: 'REMOVE_COMPLAINT', payload: id });
  }, []);

  return (
    <ComplaintsContext.Provider value={{ state, fetchComplaints, addComplaint, updateStatus, removeComplaint }}>
      {children}
    </ComplaintsContext.Provider>
  );
}

// Hook
export function useComplaints() {
  const ctx = useContext(ComplaintsContext);
  if (!ctx) throw new Error('useComplaints must be used within ComplaintsProvider');
  return ctx;
}

// Hook with auto-fetch for citizen dashboard
export function useCitizenComplaints() {
  const { state, fetchComplaints, ...rest } = useComplaints();

  useEffect(() => {
    if (!state.initialized) {
      fetchComplaints();
    }
  }, [state.initialized, fetchComplaints]);

  return { state, fetchComplaints, ...rest };
}
