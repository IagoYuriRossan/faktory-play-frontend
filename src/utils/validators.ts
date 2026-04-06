export function onlyDigits(value: string) {
  return value.replace(/\D/g, '');
}

export function formatCNPJ(value: string) {
  const digits = onlyDigits(value).slice(0, 14);
  if (digits.length <= 2) return digits;
  if (digits.length <= 5) return `${digits.slice(0, 2)}.${digits.slice(2)}`;
  if (digits.length <= 8) return `${digits.slice(0, 2)}.${digits.slice(2, 5)}.${digits.slice(5)}`;
  if (digits.length <= 12) return `${digits.slice(0, 2)}.${digits.slice(2, 5)}.${digits.slice(5, 8)}/${digits.slice(8)}`;
  return `${digits.slice(0, 2)}.${digits.slice(2, 5)}.${digits.slice(5, 8)}/${digits.slice(8, 12)}-${digits.slice(12, 14)}`;
}

export function isValidCNPJ(cnpj: string) {
  const value = onlyDigits(cnpj);
  if (value.length !== 14) return false;
  if (/^(\d)\1+$/.test(value)) return false;

  const calcCheckDigit = (base: string, factors: number[]) => {
    const sum = base
      .split('')
      .reduce((acc, digit, index) => acc + Number(digit) * factors[index], 0);
    const remainder = sum % 11;
    return remainder < 2 ? 0 : 11 - remainder;
  };

  const base = value.slice(0, 12);
  const digit1 = calcCheckDigit(base, [5, 4, 3, 2, 9, 8, 7, 6, 5, 4, 3, 2]);
  const digit2 = calcCheckDigit(`${base}${digit1}`, [6, 5, 4, 3, 2, 9, 8, 7, 6, 5, 4, 3, 2]);

  return value.endsWith(`${digit1}${digit2}`);
}

export async function validateCNPJExists(cnpj: string) {
  const digits = onlyDigits(cnpj);
  if (digits.length !== 14) {
    return { valid: false, message: 'CNPJ deve conter 14 digitos.' };
  }

  try {
    const response = await fetch(`https://brasilapi.com.br/api/cnpj/v1/${digits}`);
    if (!response.ok) {
      return { valid: false, message: 'CNPJ nao encontrado na base oficial.' };
    }
    return { valid: true, message: '' };
  } catch {
    return { valid: false, message: 'Nao foi possivel validar o CNPJ agora. Tente novamente.' };
  }
}

export function formatCEP(value: string) {
  const digits = onlyDigits(value).slice(0, 8);
  if (digits.length <= 5) return digits;
  return `${digits.slice(0, 5)}-${digits.slice(5)}`;
}

export async function fetchAddressByCEP(cep: string) {
  const digits = onlyDigits(cep);
  if (digits.length !== 8) {
    return { found: false as const, message: 'CEP deve conter 8 digitos.' };
  }

  try {
    const response = await fetch(`https://viacep.com.br/ws/${digits}/json/`);
    if (!response.ok) {
      return { found: false as const, message: 'Nao foi possivel consultar o CEP.' };
    }

    const data = await response.json();
    if (data.erro) {
      return { found: false as const, message: 'CEP nao encontrado.' };
    }

    return {
      found: true as const,
      address: {
        address: data.logradouro || '',
        city: data.localidade || '',
        uf: data.uf || '',
      },
    };
  } catch {
    return { found: false as const, message: 'Erro de rede ao consultar CEP.' };
  }
}

export function isStrongPassword(password: string) {
  return /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[^A-Za-z\d]).{8,}$/.test(password);
}
