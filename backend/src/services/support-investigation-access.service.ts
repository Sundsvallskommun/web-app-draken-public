import { resolveSupportInvestigationDocumentGroups, SupportInvestigationDocumentGroupGrant } from '@/config/support-investigation-document-groups';
import { SupportInvestigationDocumentAccess } from '@/dtos/support-investigation-profile.dto';
import { HttpException } from '@/exceptions/HttpException';
import { User } from '@/interfaces/users.interface';

interface DocumentGroups {
  readonly editorGroups: ReadonlySet<string>;
  readonly readerGroups: ReadonlySet<string>;
}

const toDocumentGroups = (grant: SupportInvestigationDocumentGroupGrant): DocumentGroups => ({
  editorGroups: new Set(grant.editorGroups),
  readerGroups: new Set(grant.readerGroups),
});

/**
 * Resolves per-document read and write access from the user's AD groups.
 *
 * Support Management performs its own authorization from the forwarded AD account, so this is not
 * the only gate. It exists so the client knows which parts of the investigation to offer at all,
 * and so the BFF answers with a 403 of its own rather than relaying an upstream failure.
 */
export class SupportInvestigationAccessService {
  private readonly groupsByDocumentKey: ReadonlyMap<string, DocumentGroups> | undefined;

  constructor(configuredGrants: readonly SupportInvestigationDocumentGroupGrant[] | undefined = resolveSupportInvestigationDocumentGroups()) {
    this.groupsByDocumentKey = configuredGrants ? new Map(configuredGrants.map(grant => [grant.documentKey, toDocumentGroups(grant)])) : undefined;
  }

  /**
   * Whether this deployment maps documents to groups at all. Without a mapping every document stays
   * visible and editable, which is what every avvikelse deployment did before per-document access existed.
   */
  isConfigured(): boolean {
    return this.groupsByDocumentKey !== undefined;
  }

  /**
   * Write is checked before read, so a group named on both lists writes: the two levels are ordered,
   * and holding the stronger one can never leave a user with the weaker.
   */
  resolveDocumentAccess(user: User, documentKey: string): SupportInvestigationDocumentAccess {
    if (!this.groupsByDocumentKey) return 'edit';

    // A configured mapping that says nothing about this document grants nothing: no group has been
    // named as its owner, so it belongs to no one until the deployment says otherwise.
    const documentGroups = this.groupsByDocumentKey.get(documentKey);
    if (!documentGroups) return 'hidden';

    const userGroups = (user.groups ?? []).map(group => group.toLowerCase());
    if (userGroups.some(group => documentGroups.editorGroups.has(group))) return 'edit';
    if (userGroups.some(group => documentGroups.readerGroups.has(group))) return 'read';
    return 'hidden';
  }

  /** A document the client never shows is a document the BFF has no reason to hand out either. */
  assertCanReadDocument(user: User, documentKey: string): void {
    if (this.resolveDocumentAccess(user, documentKey) !== 'hidden') return;
    throw new HttpException(403, 'Missing permissions for this investigation document');
  }

  /**
   * Separate from the read gate so a reader who reaches the form is refused at the save rather than
   * at the load, and is told which of the two permissions they are missing.
   */
  assertCanWriteDocument(user: User, documentKey: string): void {
    if (this.resolveDocumentAccess(user, documentKey) === 'edit') return;
    throw new HttpException(403, 'Missing write permissions for this investigation document');
  }
}
