import type { AuthError } from '@supabase/supabase-js';

// Supabase's own error messages are always in English and often technical
// (e.g. "For security purposes, you can only request this after 46
// seconds."). `error.code` is the stable identifier to switch on — see
// https://supabase.com/docs/guides/auth/debugging/error-codes — `.message`
// is only used as a last-resort fallback for network-level failures that
// never reach Supabase (and so never get a `code`).
export function translateAuthError(error: Pick<AuthError, 'message'> & { code?: string } | null): string {
  if (!error) return '';

  switch (error.code) {
    case 'invalid_credentials':
      return 'E-mail ou mot de passe incorrect.';
    case 'email_not_confirmed':
      return "Ton compte n'est pas encore confirmé — vérifie ta boîte mail.";
    case 'user_banned':
      return 'Ce compte a été suspendu.';
    case 'session_expired':
      return 'Ta session a expiré, reconnecte-toi.';
    case 'email_exists':
    case 'user_already_exists':
      return 'Un compte existe déjà avec cet e-mail.';
    case 'weak_password':
      return 'Ce mot de passe est trop faible.';
    case 'same_password':
      return "Le nouveau mot de passe doit être différent de l'ancien.";
    case 'email_provider_disabled':
    case 'phone_provider_disabled':
      return "L'inscription est temporairement désactivée.";
    case 'over_email_send_rate_limit':
    case 'over_request_rate_limit':
    case 'over_sms_send_rate_limit':
      return 'Trop de tentatives — réessaie dans quelques minutes.';
    case 'email_address_invalid':
      return "Cette adresse e-mail n'est pas acceptée.";
    default:
      break;
  }

  if (/network request failed|failed to fetch/i.test(error.message ?? '')) {
    return 'Vérifie ta connexion internet.';
  }

  return 'Une erreur est survenue. Réessaie dans un instant.';
}
