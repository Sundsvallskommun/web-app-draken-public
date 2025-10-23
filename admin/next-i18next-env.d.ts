import 'next';
import type { GetServerSidePropsContext as OriginalContext } from 'next';

declare module 'next' {
  interface GetServerSidePropsContext<P = unknown, D = unknown> extends Omit<OriginalContext<P, D>, 'locale'> {
    locale: string;
    defaultLocale: string;
  }

  // Custom GetServerSideProps that uses the updated context
  export type GetServerSideProps<
    Props extends { [key: string]: unknown } = { [key: string]: unknown },
    Params extends ParsedUrlQuery = ParsedUrlQuery,
    Preview extends PreviewData = PreviewData,
  > = (context: GetServerSidePropsContext<Params, Preview>) => Promise<GetServerSidePropsResult<Props>>;
}
