import { renderHook, act } from '@testing-library/react';
import { vi, beforeEach, describe, it, expect } from 'vitest';

vi.mock('@/integrations/supabase/client', () => {
  const makeChain = (result: any) => {
    const chain: any = {
      select: vi.fn(() => chain),
      eq: vi.fn(() => chain),
      gte: vi.fn(() => chain),
      order: vi.fn(() => chain),
      single: vi.fn(() => Promise.resolve(result)),
      maybeSingle: vi.fn(() => Promise.resolve(result)),
      insert: vi.fn(() => Promise.resolve(result)),
      then: vi.fn((cb: any) => cb(result)),
    };
    return chain;
  };
  const from = vi.fn((table: string) => makeChain({ data: [], error: null }));
  return { supabase: { from } };
});

import { supabase } from '@/integrations/supabase/client';
import { useRidesViewModel } from '@/viewmodels/useRidesViewModel';

describe('useRidesViewModel', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('fetchRides calls supabase.from("rides")', async () => {
    const { result } = renderHook(() => useRidesViewModel());

    await act(async () => {
      await result.current.fetchRides();
    });

    expect((supabase.from as any)).toHaveBeenCalledWith('rides');
  });
});