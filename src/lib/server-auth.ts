
import { cookies } from 'next/headers';
import { auth } from '@/lib/firebase-admin';
import { db } from '@/lib/firebase-admin';
import { User } from '@/lib/types';

export class UnauthorizedError extends Error {
  constructor(message = 'No autorizado') {
    super(message);
    this.name = 'UnauthorizedError';
  }
}

/**
 * Obtiene el usuario autenticado desde el lado del servidor.
 * Verifica el token de sesión de la cookie y obtiene los datos del usuario de Firestore.
 * @throws {UnauthorizedError} Si el usuario no está autenticado.
 * @returns {Promise<{user: User, decodedToken: admin.auth.DecodedIdToken}>} El objeto de usuario y el token decodificado.
 */
export async function getAuthenticatedUser() {
  const sessionCookie = cookies().get('session')?.value;

  if (!sessionCookie) {
    throw new UnauthorizedError('No hay cookie de sesión.');
  }

  try {
    const decodedToken = await auth.verifySessionCookie(sessionCookie, true);
    const userDoc = await db.collection('users').doc(decodedToken.uid).get();

    if (!userDoc.exists) {
      throw new UnauthorizedError('El usuario no existe en la base de datos.');
    }

    const user = userDoc.data() as User;

    return { user, decodedToken };
  } catch (error) {
    console.error('Error al verificar la sesión:', error);
    throw new UnauthorizedError('La sesión es inválida o ha expirado.');
  }
}

type Role = 'Administrador' | 'Mecanico' | 'Cajero' | 'Cliente';

/**
 * Valida que el usuario autenticado tiene uno de los roles permitidos.
 * @param {Role[]} allowedRoles - Array de roles permitidos para la acción.
 * @throws {UnauthorizedError} Si el usuario no está autenticado o no tiene el rol requerido.
 * @returns {Promise<User>} El objeto de usuario si la validación es exitosa.
 */
export async function requireRole(allowedRoles: Role[]): Promise<User> {
  const { user } = await getAuthenticatedUser();
  
  if (!allowedRoles.includes(user.role as Role)) {
    throw new UnauthorizedError(`Acción no permitida. Se requiere uno de los siguientes roles: ${allowedRoles.join(', ')}.`);
  }

  return user;
}
