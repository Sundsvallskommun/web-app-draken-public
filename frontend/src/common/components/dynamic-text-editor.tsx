import { lazy, Suspense } from 'react';

const LazyTextEditor = lazy(() => import('@sk-web-gui/text-editor'));

export default function DynamicTextEditor(props: Record<string, unknown>) {
  return (
    <Suspense fallback={<div className="h-[15rem] w-full animate-pulse bg-gray-100 rounded" />}>
      <LazyTextEditor {...props} />
    </Suspense>
  );
}
