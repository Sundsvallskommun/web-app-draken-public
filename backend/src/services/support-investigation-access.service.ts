import { resolveSupportInvestigationDocumentGroups, SupportInvestigationDocumentGroupGrant } from '@/config/support-investigation-document-groups';
import { SupportInvestigationDocumentAccess } from '@/dtos/support-investigation-profile.dto';
import { HttpException } from '@/exceptions/HttpException';
import { User } from '@/interfaces/users.interface';

/**
 * Resolves per-document write access from the user's AD groups.
 *
 * Support Management performs its own authorization from the forwarded AD account, so this is not
 * the only gate. It exists so the client knows which parts of the investigation to offer at all,
 * and so the BFF answers with a 403 of its own rather than relaying an upstream failure.
 */
export class SupportInvestigationAccessService {
  private readonly editorGroupsByDocumentKey: ReadonlyMap<string, ReadonlySet<string>> | undefined;

  constructor(configuredGrants: readonly SupportInvestigationDocumentGroupGrant[] | undefined = resolveSupportInvestigationDocumentGroups()) {
    this.editorGroupsByDocumentKey = configuredGrants
      ? new Map(configuredGrants.map(grant => [grant.documentKey, new Set(grant.groups)]))
      : undefined;
  }

  /**
   * Whether this deployment maps documents to groups at all. Without a mapping every document stays
   * visible and editable, which is what every avvikelse deployment did before per-document access existed.
   */
  isConfigured(): boolean {
    return this.editorGroupsByDocumentKey !== undefined;
  }

  resolveDocumentAccess(user: User, documentKey: string): SupportInvestigationDocumentAccess {
    if (!this.editorGroupsByDocumentKey) return 'edit';

    // A configured mapping that says nothing about this document grants nothing: no group has been
    // named as its owner, so it belongs to no one until the deployment says otherwise.
    const editorGroups = this.editorGroupsByDocumentKey.get(documentKey);
    if (!editorGroups) return 'hidden';

    const userGroups = user.groups ?? [];
    return userGroups.some(group => editorGroups.has(group.toLowerCase())) ? 'edit' : 'hidden';
  }

  /**
   * Access is binary, so reads and writes are refused by the same rule: a document the client never
   * shows is a document the BFF has no reason to hand out either.
   */
  assertCanAccessDocument(user: User, documentKey: string): void {
    if (this.resolveDocumentAccess(user, documentKey) === 'edit') return;
    throw new HttpException(403, 'Missing permissions for this investigation document');
  }
}
