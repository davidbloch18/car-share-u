import { describe, it, expect, beforeEach, vi } from 'vitest';
import { cn } from '@/lib/utils';
import { IsraeliAcademicDomains } from '@/lib/israeliAcademicDomains';

/**
 * Test 1: cn() utility function - Tests Tailwind CSS class merging
 * This tests basic functionality without mocks
 * Pattern: Arrange, Act, Assert
 */
describe('cn() utility function', () => {
  it('should merge Tailwind classes correctly', () => {
    // ARRANGE: Set up conflicting Tailwind classes
    const classesWithConflict = ['px-2', 'py-1', 'px-4'];
    
    // ACT: Call cn() with conflicting classes
    const result = cn(...classesWithConflict);
    
    // ASSERT: Verify that last value wins for conflicting utilities
    expect(result).toContain('py-1');
    expect(result).toContain('px-4');
    expect(result).not.toContain('px-2');
  });

  it('should handle conditional classes', () => {
    // ARRANGE: Set up condition and base classes
    const isActive = true;
    const baseClasses = 'p-2 rounded';
    const activeClasses = 'bg-blue-500 text-white';
    const inactiveClasses = 'bg-gray-100';
    
    // ACT: Call cn() with conditional expressions
    const result = cn(
      baseClasses,
      isActive && activeClasses,
      !isActive && inactiveClasses
    );
    
    // ASSERT: Verify correct classes are included based on condition
    expect(result).toContain('p-2');
    expect(result).toContain('rounded');
    expect(result).toContain('bg-blue-500');
    expect(result).toContain('text-white');
    expect(result).not.toContain('bg-gray-100');
  });

  it('should remove falsy values', () => {
    // ARRANGE: Set up classes with falsy values (false, undefined, null)
    const classesWithFalsyValues = [
      'p-2',
      false && 'hidden',
      undefined && 'text-red',
      null && 'border',
      'rounded'
    ];
    
    // ACT: Call cn() with falsy values mixed in
    const result = cn(...classesWithFalsyValues);
    
    // ASSERT: Verify only truthy classes are in result
    const expectedResult = 'p-2 rounded';
    expect(result).toBe(expectedResult);
    expect(result).not.toContain('hidden');
    expect(result).not.toContain('text-red');
    expect(result).not.toContain('border');
  });
});

/**
 * Test 2: Israeli Academic Domains validation - Tests domain validation
 * This includes creating a mock function to validate academic emails
 * Pattern: Arrange, Act, Assert
 */
describe('Israeli Academic Domains validation with mock', () => {
  // Mock email validator function
  const isValidAcademicEmail = vi.fn((email: string): boolean => {
    const [, domain] = email.split('@');
    return IsraeliAcademicDomains.includes(domain);
  });

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should validate legitimate academic emails', () => {
    // ARRANGE: Set up valid academic email addresses
    const validEmails = [
      'student@huji.ac.il',
      'teacher@tau.ac.il',
      'professor@technion.ac.il',
    ];

    // ACT: Call the mock validation function on each email
    const results = validEmails.map(email => isValidAcademicEmail(email));

    // ASSERT: Verify all results are true and function was called correctly
    results.forEach(result => {
      expect(result).toBe(true);
    });
    expect(isValidAcademicEmail).toHaveBeenCalledTimes(3);
    validEmails.forEach(email => {
      expect(isValidAcademicEmail).toHaveBeenCalledWith(email);
    });
  });

  it('should reject non-academic domains', () => {
    // ARRANGE: Set up invalid (non-academic) email addresses
    const invalidEmails = [
      'user@gmail.com',
      'test@yahoo.com',
      'person@company.com',
    ];

    // ACT: Call validation function on each non-academic email
    const results = invalidEmails.map(email => isValidAcademicEmail(email));

    // ASSERT: Verify all results are false
    results.forEach(result => {
      expect(result).toBe(false);
    });
    expect(isValidAcademicEmail).toHaveBeenCalledTimes(3);
  });

  it('should track how many times validation is called', () => {
    // ARRANGE: Set up a mix of valid and invalid emails
    const testEmails = [
      'student@huji.ac.il',      // valid
      'invalid@gmail.com',        // invalid
      'user@tau.ac.il'            // valid
    ];

    // ACT: Call validation function on all test emails
    testEmails.forEach(email => isValidAcademicEmail(email));

    // ASSERT: Verify mock was called exactly 3 times with correct parameters
    expect(isValidAcademicEmail).toHaveBeenCalledTimes(3);
    expect(isValidAcademicEmail).toHaveBeenNthCalledWith(1, 'student@huji.ac.il');
    expect(isValidAcademicEmail).toHaveBeenNthCalledWith(2, 'invalid@gmail.com');
    expect(isValidAcademicEmail).toHaveBeenNthCalledWith(3, 'user@tau.ac.il');
  });
});

/**
 * Test 3: Email validation regex - Tests email format validation
 * This uses mock email validation patterns
 * Pattern: Arrange, Act, Assert
 */
describe('Email validation patterns', () => {
  // Mock email format validators
  const validateEmailLocalPart = vi.fn((localPart: string): boolean => {
    const localPartRegex = /^[A-Za-z0-9._%+-]{1,25}$/;
    return localPartRegex.test(localPart);
  });

  const validateEmailFormat = vi.fn((email: string): boolean => {
    const [localPart, domain] = email.split('@');
    if (!localPart || !domain) return false;
    return validateEmailLocalPart(localPart) && domain.length > 0;
  });

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should accept valid email local parts', () => {
    // ARRANGE: Define valid email local parts that follow the regex pattern
    const validLocalParts = [
      'john.doe',      // Contains dot
      'user+tag',      // Contains plus
      'test_email',    // Contains underscore
      'a1b2c3'         // Alphanumeric
    ];

    // ACT: Validate each local part
    const results = validLocalParts.map(part => validateEmailLocalPart(part));

    // ASSERT: All should pass validation
    results.forEach((result, index) => {
      expect(result).toBe(true);
      expect(validateEmailLocalPart).toHaveBeenCalledWith(validLocalParts[index]);
    });
    expect(validateEmailLocalPart).toHaveBeenCalledTimes(4);
  });

  it('should reject invalid email local parts', () => {
    // ARRANGE: Define invalid email local parts
    const invalidLocalParts = [
      'a'.repeat(26),   // Too long (exceeds 25 character limit)
      'invalid@email',  // Contains @ (not allowed in local part)
      'user name',      // Contains space (not allowed)
    ];

    // ACT: Validate each invalid local part
    const results = invalidLocalParts.map(part => validateEmailLocalPart(part));

    // ASSERT: All should fail validation
    results.forEach(result => {
      expect(result).toBe(false);
    });
    expect(validateEmailLocalPart).toHaveBeenCalledTimes(3);
  });

  it('should validate complete email addresses with mock tracking', () => {
    // ARRANGE: Set up a valid complete email address
    const validEmail = 'john.doe@huji.ac.il';
    const expectedLocalPart = 'john.doe';

    // ACT: Call the email format validator
    const result = validateEmailFormat(validEmail);

    // ASSERT: Verify function was called with correct parameters and result is true
    expect(result).toBe(true);
    expect(validateEmailFormat).toHaveBeenCalledWith(validEmail);
    expect(validateEmailFormat).toHaveBeenCalledTimes(1);
    expect(validateEmailLocalPart).toHaveBeenCalledWith(expectedLocalPart);
  });

  it('should reject emails with invalid format', () => {
    // ARRANGE: Define email addresses with various format issues
    const testEmail1 = 'test';
    const testEmail2 = '@domain.com';

    // ACT: Validate each problematic email
    const result1 = validateEmailFormat(testEmail1);
    const result2 = validateEmailFormat(testEmail2);

    // ASSERT: Verify both return false and calls were tracked
    expect(result1).toBe(false);
    expect(result2).toBe(false);
    expect(validateEmailFormat).toHaveBeenCalledTimes(2);
    expect(validateEmailFormat).toHaveBeenNthCalledWith(1, 'test');
    expect(validateEmailFormat).toHaveBeenNthCalledWith(2, '@domain.com');
  });
});
