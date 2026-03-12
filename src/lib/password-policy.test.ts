import { describe, it, expect } from 'vitest';
import { getPasswordValidationError } from './password-policy';

describe('Password Policy Validation', () => {
  it('rejects an empty password', () => {
    const error = getPasswordValidationError('');
    expect(error).toContain('al menos 8 caracteres');
  });

  it('rejects a short password', () => {
    const error = getPasswordValidationError('Abc1!');
    expect(error).toContain('al menos 8 caracteres');
  });

  it('rejects a password without uppercase letters', () => {
    const error = getPasswordValidationError('abcdef1!');
    expect(error).toContain('al menos una mayúscula');
  });

  it('rejects a password without numbers', () => {
    const error = getPasswordValidationError('Abcdefgh!');
    expect(error).toContain('al menos un número');
  });

  it('accepts a valid strong password', () => {
    const error = getPasswordValidationError('StrongPass123!');
    expect(error).toBeNull();
  });
});
