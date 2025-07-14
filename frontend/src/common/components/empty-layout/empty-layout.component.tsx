interface EmptyLayoutProps {
  children: React.ReactNode;
}

export default function EmptyLayout({ children }: EmptyLayoutProps) {
  return (
    <div className="EmptyLayout bg-background-200 text-body">
      <div className="min-h-screen">{children}</div>
    </div>
  );
}
