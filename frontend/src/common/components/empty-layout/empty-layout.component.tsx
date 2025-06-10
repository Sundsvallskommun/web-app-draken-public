import Head from 'next/head';

export default function EmptyLayout({ children }) {
  return (
    <>
      {/* <Head>
                <title>{title}</title>
            </Head> */}

      <div className="bg-background-200 min-h-screen">{children}</div>
    </>
  );
}
