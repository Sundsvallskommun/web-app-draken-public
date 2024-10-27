import { getAdminUsers } from '@common/services/user-service';

export interface SupportAdmin {
  firstName: string;
  lastName: string;
  adAccount: string;
  id: string;
}

export const getSupportAdmins: () => Promise<SupportAdmin[]> = async () => {
  const byGroup = await getAdminUsers()
    .then((res) =>
      res.map((u) => ({
        firstName: u.displayName.split(' ')[1],
        lastName: u.displayName.split(' ')[0],
        adAccount: u.adAccount,
        id: u.id,
      }))
    )
    .catch((e) => {
      console.error('No adminstrators found');
      return [];
    });
  return Promise.resolve(byGroup);
};
