export default function AuthLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-screen flex items-center justify-center p-4">
      <div className="w-full max-w-sm">
        <div className="mb-6 text-center">
          <h1 className="text-2xl font-bold text-primary">TodoList</h1>
          <p className="text-sm text-muted">Personal &amp; team tasks</p>
        </div>
        {children}
      </div>
    </div>
  );
}
