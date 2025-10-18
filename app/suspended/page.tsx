export default function SuspendedPage() {
  return (
    <div className="relative min-h-[100dvh]">
      <div className="fixed inset-0 bg-black/40 backdrop-blur-md z-10" />
      <div className="relative z-20 flex items-center justify-center min-h-[100dvh] p-4">
        <div className="bg-background border rounded-lg shadow-lg max-w-md w-full p-6 text-center">
          <div className="text-2xl font-semibold mb-2">Compte suspendu</div>
          <div className="text-muted-foreground text-sm mb-4">
            Votre compte a été suspendu. Veuillez contacter l’administrateur pour rétablir l’accès.
          </div>
          <div className="text-xs text-muted-foreground">Code: SUSPENDED</div>
        </div>
      </div>
    </div>
  );
}
