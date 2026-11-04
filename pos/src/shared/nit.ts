const DV_WEIGHTS = [3, 7, 13, 17, 19, 23, 29, 37, 41, 43, 47, 53, 59, 67, 71];

// Dígito de verificación del NIT según el algoritmo de la DIAN (módulo 11).
export function nitCheckDigit(nit: string): string {
  const digits = nit.replace(/\D/g, "");
  if (digits.length === 0 || digits.length > DV_WEIGHTS.length) {
    throw new Error("NIT inválido");
  }
  let sum = 0;
  for (let i = 0; i < digits.length; i++) {
    sum += Number(digits[digits.length - 1 - i]) * DV_WEIGHTS[i]!;
  }
  const rest = sum % 11;
  return String(rest > 1 ? 11 - rest : rest);
}
