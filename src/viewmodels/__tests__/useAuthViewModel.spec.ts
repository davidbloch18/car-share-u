import { renderHook, act } from '@testing-library/react';
import { vi, beforeEach, describe, it, expect } from 'vitest';

vi.mock('@/integrations/supabase/client', () => {
  const signUp = vi.fn().mockResolvedValue({ data: { session: null }, error: null });
  const signInWithPassword = vi.fn().mockResolvedValue({ error: null });
  const getSession = vi.fn().mockResolvedValue({ data: { session: null } });
  const onAuthStateChange = vi.fn().mockReturnValue({ data: { subscription: { unsubscribe: vi.fn() } } });
  return {
    supabase: {
      auth: {
        signUp,
        signInWithPassword,
        getSession,
        onAuthStateChange,
      },
    },
  };
});

import { supabase } from '@/integrations/supabase/client';
import { useAuthViewModel } from '@/viewmodels/useAuthViewModel';

describe('useAuthViewModel', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('exposes signUp and calls supabase.auth.signUp', async () => {
    const { result } = renderHook(() => useAuthViewModel());

    await act(async () => {
      const { data, error } = await result.current.signUp({ email: 'a@b.com', password: 'pw', firstName: 'A', lastName: 'B', redirectTo: 'http://localhost' });
      expect((supabase.auth.signUp as any)).toHaveBeenCalled();
      expect(error).toBeNull();
    });
  });

  it('exposes signIn and calls supabase.auth.signInWithPassword', async () => {
    const { result } = renderHook(() => useAuthViewModel());

    await act(async () => {
      const res = await result.current.signIn({ email: 'a@b.com', password: 'pw' });
      expect((supabase.auth.signInWithPassword as any)).toHaveBeenCalled();
      expect(res.error).toBeNull();
    });
  });
});