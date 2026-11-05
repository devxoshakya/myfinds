export default function PrivateReportNotFound() {
  return (
    <div className="mx-auto flex w-full max-w-md flex-col items-center px-4 py-20 text-center">
      <h1 className="text-xl font-semibold tracking-tight">Report not found</h1>
      <p className="mt-2 text-sm leading-6 text-muted-foreground">
        This private link is invalid or no longer available.
      </p>
    </div>
  );
}
