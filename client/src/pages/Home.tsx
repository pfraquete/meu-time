import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Loader2 } from "lucide-react";
import { APP_LOGO, APP_TITLE } from "@/const";
import { useLocation } from "wouter";

export default function Home() {
  const [, setLocation] = useLocation();
  const { user, profile, loading, isAuthenticated, signOut } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="animate-spin h-12 w-12" />
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col">
      <header className="border-b bg-background">
        <div className="container flex h-16 items-center justify-between">
          <div className="flex items-center gap-2">
            <img src={APP_LOGO} alt={APP_TITLE} className="h-8 w-8" />
            <h1 className="text-xl font-bold">{APP_TITLE}</h1>
          </div>
          <div className="flex items-center gap-4">
            <span className="text-sm text-muted-foreground">
              Olá, {profile?.name || user?.email}
            </span>
            <Button variant="outline" onClick={() => signOut()}>
              Sair
            </Button>
          </div>
        </div>
      </header>
      <main className="flex-1 container py-8">
        <div className="space-y-6">
          <div>
            <h2 className="text-3xl font-bold">Bem-vindo ao {APP_TITLE}</h2>
            <p className="text-muted-foreground mt-2">
              Sistema de gerenciamento de jogos esportivos entre amigos
            </p>
          </div>
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            <Button variant="default" className="h-24" onClick={() => setLocation('/matches/create')}>
              Criar Partida
            </Button>
            <Button variant="outline" className="h-24" onClick={() => setLocation('/matches')}>
              Buscar Partidas
            </Button>
            <Button variant="outline" className="h-24" onClick={() => setLocation('/profile')}>
              Meu Perfil
            </Button>
          </div>
        </div>
      </main>
    </div>
  );
}
