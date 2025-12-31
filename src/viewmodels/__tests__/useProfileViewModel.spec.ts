import { renderHook, act, waitFor } from '@testing-library/react';
import { vi, beforeEach, describe, it, expect } from 'vitest';

vi.mock('@/integrations/supabase/client', () => {
  const from = vi.fn(() => ({ select: vi.fn(() => ({ eq: vi.fn(() => ({ single: vi.fn().mockResolvedValue({ data: { id: 'u1', first_name: 'A', last_name: 'B' }, error: null }) })) })) }))
  return {
    supabase: {
      from,
    },
  };
});

import { supabase } from '@/integrations/supabase/client';

vi.mock('@/viewmodels/useAuthViewModel', () => ({ useAuthViewModel: () => ({ session: { user: { id: 'u1' } } }) }));

import { useProfileViewModel } from '@/viewmodels/useProfileViewModel';

describe('useProfileViewModel', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('mock chain works directly', async () => {
    const { supabase } = await import('@/integrations/supabase/client');
    const res = await (supabase.from as any)('profiles').select('*').eq('id','u1').single();
    expect(res.data.id).toBe('u1');
  });

  it('fetches profile on init and exposes profile', async () => {
    const { result } = renderHook(() => useProfileViewModel());

    // wait for profile to be populated by the effect
    await waitFor(() => {
      expect(result.current.profile).not.toBeNull();
      expect(result.current.profile.first_name).toBe('A');
    }, { timeout: 2000 });

    expect((supabase.from as any)).toHaveBeenCalledWith('profiles');
  });
});