/**
 * The handler role keys this flow assigns to.
 *
 * They are the same keys the deployment configures in `HANDLER_GROUP_ROLES`, and the backend
 * enforces the membership - this constant only decides which people the client offers, so a
 * mismatch shows up as an empty selector rather than as a wrong assignment.
 */
export const LEX_MANAGER_ROLE_KEY = 'lex-ansvarig';
export const UNIT_MANAGER_ROLE_KEY = 'enhetschef';
