import { useEffect } from "react";
import { useLocation } from "wouter";
import { useAuth } from "@/_core/hooks/useAuth";
import { getLoginUrl } from "@/const";
import { Shield, TrendingUp } from "lucide-react";
import { Button } from "@/components/ui/button";

export default function Home() {
  const { user, loading } = useAuth();
  const [, setLocation] = useLocation();

  useEffect(() => {
    if (!loading && user) {
      setLocation("/dashboard");
    }
  }, [user, loading, setLocation]);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-background">
        <div className="animate-pulse text-muted-foreground">Cargando...</div>
      </div>
    );
  }

  if (user) return null;

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-blue-950 to-slate-900 flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        <div className="bg-white/5 backdrop-blur-sm border border-white/10 rounded-2xl p-8 shadow-2xl">
          <div className="flex flex-col items-center gap-6 mb-8">
            <div className="w-20 h-20 rounded-2xl bg-blue-600 flex items-center justify-center shadow-lg">
              <TrendingUp className="h-10 w-10 text-white" />
            </div>
            <div className="text-center">
              <h1 className="text-3xl font-bold text-white tracking-tight">Impulso al 10</h1>
              <p className="text-blue-200/70 mt-2 text-sm">
                Sistema de gestión de préstamos personales
              </p>
            </div>
          </div>

          <div className="space-y-3 mb-8">
            {[
              "Control total de préstamos y cuotas",
              "Gestión de clientes y documentos",
              "Auditoría completa de operaciones",
              "Dashboard con indicadores financieros",
            ].map((feature) => (
              <div key={feature} className="flex items-center gap-3 text-sm text-blue-100/80">
                <div className="w-1.5 h-1.5 rounded-full bg-blue-400 shrink-0" />
                {feature}
              </div>
            ))}
          </div>

          <Button
            onClick={() => { window.location.href = getLoginUrl(); }}
            size="lg"
            className="w-full bg-blue-600 hover:bg-blue-500 text-white font-semibold"
          >
            <Shield className="mr-2 h-4 w-4" />
            Iniciar sesión
          </Button>

          <p className="text-center text-xs text-blue-200/40 mt-4">
            Acceso restringido a personal autorizado
          </p>
        </div>
      </div>
    </div>
  );
}
