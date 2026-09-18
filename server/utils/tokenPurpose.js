/**
 * JWT purpose claims — keep email-verify and password-reset tokens distinct.
 */
export const TOKEN_PURPOSE = Object.freeze({
  EMAIL_VERIFY: 'email_verify',
  PASSWORD_RESET: 'password_reset',
});
