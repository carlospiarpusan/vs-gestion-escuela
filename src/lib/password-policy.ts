export const PASSWORD_MIN_LENGTH = 8;
export const PASSWORD_POLICY_HINT =
  "La contraseña debe tener al menos 8 caracteres, una mayúscula y un número.";

export function getPasswordValidationError(password: string): string | null {
  if (password.length < PASSWORD_MIN_LENGTH) {
    return `La contraseña debe tener al menos ${PASSWORD_MIN_LENGTH} caracteres.`;
  }

  if (!/[A-Z]/.test(password)) {
    return "La contraseña debe incluir al menos una mayúscula.";
  }

  if (!/[0-9]/.test(password)) {
    return "La contraseña debe incluir al menos un número.";
  }

  return null;
}
