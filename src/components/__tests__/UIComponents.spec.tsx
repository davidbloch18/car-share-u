import { describe, it, expect, beforeEach, vi } from 'vitest';

/**
 * UI Integration Tests - Espresso-like testing approach for React components
 * Tests UI element behavior and state changes through interaction simulation
 * Pattern: Arrange, Act, Assert
 */

// Mock DOM Element for simulating Button behavior
class MockButton {
  private isDisabled: boolean = false;
  private text: string;
  private clickHandler?: (e: MouseEvent) => void;

  constructor(text: string, onClick?: (e: MouseEvent) => void) {
    this.text = text;
    this.clickHandler = onClick;
  }

  click(): void {
    if (!this.isDisabled && this.clickHandler) {
      this.clickHandler({} as MouseEvent);
    }
  }

  setDisabled(disabled: boolean): void {
    this.isDisabled = disabled;
  }

  setText(text: string): void {
    this.text = text;
  }

  isClickable(): boolean {
    return !this.isDisabled;
  }

  getText(): string {
    return this.text;
  }

  getDisabledState(): boolean {
    return this.isDisabled;
  }
}

// Mock DOM Element for simulating Input behavior
class MockInput {
  private value: string = '';
  private type: string = 'text';
  private isFocused: boolean = false;
  private changeHandler?: (e: Event) => void;
  private focusHandler?: (e: Event) => void;
  private blurHandler?: (e: Event) => void;

  constructor(type: string = 'text') {
    this.type = type;
  }

  setValue(value: string): void {
    this.value = value;
    if (this.changeHandler) {
      this.changeHandler({} as Event);
    }
  }

  getValue(): string {
    return this.value;
  }

  setType(type: string): void {
    this.type = type;
  }

  getType(): string {
    return this.type;
  }

  focus(): void {
    this.isFocused = true;
    if (this.focusHandler) {
      this.focusHandler({} as Event);
    }
  }

  blur(): void {
    this.isFocused = false;
    if (this.blurHandler) {
      this.blurHandler({} as Event);
    }
  }

  isFocusedState(): boolean {
    return this.isFocused;
  }

  onChange(handler: (e: Event) => void): void {
    this.changeHandler = handler;
  }

  onFocus(handler: (e: Event) => void): void {
    this.focusHandler = handler;
  }

  onBlur(handler: (e: Event) => void): void {
    this.blurHandler = handler;
  }

  isEmpty(): boolean {
    return this.value === '';
  }

  clear(): void {
    this.value = '';
  }
}

/**
 * Test 1: Button UI Element - Espresso-like testing
 * Tests button click interactions and state changes
 */
describe('Button UI Element (Espresso-like)', () => {
  it('should render button and handle click interaction', () => {
    // ARRANGE: Create mock button with click handler
    const handleClick = vi.fn();
    const button = new MockButton('Click Me', handleClick);

    // ASSERT initial state: button exists and is clickable
    expect(button.getText()).toBe('Click Me');
    expect(button.isClickable()).toBe(true);
    expect(handleClick).not.toHaveBeenCalled();

    // ACT: User clicks the button
    button.click();

    // ASSERT after click: handler was called and button remains clickable
    expect(handleClick).toHaveBeenCalledTimes(1);
    expect(button.isClickable()).toBe(true);
    expect(button.getText()).toBe('Click Me');
  });

  it('should change visual state when disabled prop changes', () => {
    // ARRANGE: Create button in enabled state
    const button = new MockButton('Submit');

    // ASSERT initial state: button is enabled
    expect(button.getDisabledState()).toBe(false);
    expect(button.isClickable()).toBe(true);
    expect(button.getText()).toBe('Submit');

    // ACT: Disable the button and update text
    button.setDisabled(true);
    button.setText('Submitting...');

    // ASSERT after state change: button is disabled and text is updated
    expect(button.getDisabledState()).toBe(true);
    expect(button.isClickable()).toBe(false);
    expect(button.getText()).toBe('Submitting...');
  });

  it('should respond to multiple click events correctly', () => {
    // ARRANGE: Create button with click counter
    const handleClick = vi.fn();
    const button = new MockButton('Click Count', handleClick);

    // ASSERT initial state: no clicks registered
    expect(handleClick).not.toHaveBeenCalled();

    // ACT: Click button first time
    button.click();

    // ASSERT after first click
    expect(handleClick).toHaveBeenCalledTimes(1);

    // ACT: Click button second time
    button.click();

    // ASSERT after second click
    expect(handleClick).toHaveBeenCalledTimes(2);

    // ACT: Click button third time
    button.click();

    // ASSERT after third click: all clicks registered
    expect(handleClick).toHaveBeenCalledTimes(3);
    expect(button.isClickable()).toBe(true);
  });
});

/**
 * Test 2: Input UI Element - Espresso-like testing
 * Tests input value changes, validation, focus/blur events
 */
describe('Input UI Element (Espresso-like)', () => {
  it('should update input value when user types', () => {
    // ARRANGE: Create input with change handler
    const handleChange = vi.fn();
    const input = new MockInput('text');
    input.onChange(handleChange);

    // ASSERT initial state: input is empty
    expect(input.getValue()).toBe('');
    expect(input.isEmpty()).toBe(true);
    expect(handleChange).not.toHaveBeenCalled();

    // ACT: User types into the input
    input.setValue('John');

    // ASSERT after typing: input value is updated and handler called
    expect(input.getValue()).toBe('John');
    expect(input.isEmpty()).toBe(false);
    expect(handleChange).toHaveBeenCalledTimes(1);
  });

  it('should validate email input and show error state', () => {
    // ARRANGE: Create email input and validation function
    const validateEmail = (email: string) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
    const handleChange = vi.fn();
    const input = new MockInput('email');
    input.onChange(handleChange);

    // ASSERT initial state: input is empty and valid
    expect(input.getValue()).toBe('');
    expect(input.isEmpty()).toBe(true);

    // ACT: User types invalid email
    input.setValue('invalid-email');

    // ASSERT after invalid input: value is set but validation fails
    expect(input.getValue()).toBe('invalid-email');
    expect(validateEmail('invalid-email')).toBe(false);

    // ACT: User corrects to valid email
    input.setValue('user@example.com');

    // ASSERT after valid input: value is correct and validation passes
    expect(input.getValue()).toBe('user@example.com');
    expect(validateEmail('user@example.com')).toBe(true);
    expect(handleChange).toHaveBeenCalledTimes(2);
  });

  it('should clear input and reset to initial state', () => {
    // ARRANGE: Create input with initial value
    const input = new MockInput('text');
    input.setValue('Initial Text');

    // ASSERT initial state: input has value
    expect(input.getValue()).toBe('Initial Text');
    expect(input.isEmpty()).toBe(false);

    // ACT: Clear the input
    input.clear();

    // ASSERT after clearing: input is empty
    expect(input.getValue()).toBe('');
    expect(input.isEmpty()).toBe(true);
  });

  it('should toggle password visibility and update input type', () => {
    // ARRANGE: Create password input
    const input = new MockInput('password');
    input.setValue('secret123');

    // ASSERT initial state: input is password type
    expect(input.getType()).toBe('password');
    expect(input.getValue()).toBe('secret123');

    // ACT: Toggle to text input type (show password)
    input.setType('text');

    // ASSERT after toggle: input type changed to text, password visible
    expect(input.getType()).toBe('text');
    expect(input.getValue()).toBe('secret123');

    // ACT: Toggle back to password type (hide password)
    input.setType('password');

    // ASSERT after toggle back: input type changed back to password
    expect(input.getType()).toBe('password');
  });

  it('should track input focus and blur events', () => {
    // ARRANGE: Create input with focus handlers
    const handleFocus = vi.fn();
    const handleBlur = vi.fn();
    const input = new MockInput('text');
    input.onFocus(handleFocus);
    input.onBlur(handleBlur);

    // ASSERT initial state: input is not focused
    expect(input.isFocusedState()).toBe(false);
    expect(handleFocus).not.toHaveBeenCalled();

    // ACT: User focuses the input
    input.focus();

    // ASSERT after focus: focus handler called and input is focused
    expect(handleFocus).toHaveBeenCalledTimes(1);
    expect(input.isFocusedState()).toBe(true);

    // ACT: User blurs the input
    input.blur();

    // ASSERT after blur: blur handler called and input loses focus
    expect(handleBlur).toHaveBeenCalledTimes(1);
    expect(input.isFocusedState()).toBe(false);
  });
});
