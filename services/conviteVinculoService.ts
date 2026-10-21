
import * as Crypto from 'expo-crypto';

// Gera um token aleatório de 256 bits.
// Não utiliza Math.random().
export async function gerarTokenSeguro(): Promise<string> {
  const bytes = await Crypto.getRandomBytesAsync(32);

  return Array.from(bytes)
    .map((byte) => byte.toString(16).padStart(2, '0'))
    .join('');
}

// Verifica somente o formato do token.
// A validade e a autorização serão verificadas
// posteriormente pelas regras do Firestore.
export function tokenTemFormatoValido(token: string): boolean {
  return /^[a-f0-9]{64}$/.test(token.trim().toLowerCase());
}
