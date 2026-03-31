import { useState } from "react";
import DashboardLayout from "@/components/DashboardLayout";
import { trpc } from "@/lib/trpc";
import { formatDateTime } from "@/lib/format";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Search, Shield } from "lucide-react";

const ACTION_COLORS: Record<string, string> = {
  CREATE: "bg-green-100 text-green-800",
  UPDATE: "bg-blue-100 text-blue-800",
  DELETE: "bg-red-100 text-red-800",
  VERIFY: "bg-emerald-100 text-emerald-800",
  REJECT: "bg-orange-100 text-orange-800",
  REVERSE: "bg-purple-100 text-purple-800",
  APPLY: "bg-yellow-100 text-yellow-800",
  REGISTER: "bg-cyan-100 text-cyan-800",
  UPLOAD: "bg-indigo-100 text-indigo-800",
};

function getActionColor(action: string): string {
  const prefix = action.split("_")[0];
  return ACTION_COLORS[prefix] ?? "bg-gray-100 text-gray-700";
}

export default function Audit() {
  const [search, setSearch] = useState("");
  const [entityFilter, setEntityFilter] = useState("all");

  const { data: logs = [], isLoading } = trpc.audit.list.useQuery({ limit: 200, entity: entityFilter === "all" ? undefined : entityFilter });

  const filtered = logs.filter(log =>
    log.action.toLowerCase().includes(search.toLowerCase()) ||
    (log.userName ?? "").toLowerCase().includes(search.toLowerCase()) ||
    (log.entity ?? "").toLowerCase().includes(search.toLowerCase())
  );

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Auditoría</h1>
          <p className="text-muted-foreground text-sm mt-1">Registro completo de todas las operaciones del sistema</p>
        </div>

        <Card>
          <CardHeader className="pb-3">
            <div className="flex flex-col sm:flex-row gap-3">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Buscar por acción, usuario o entidad..."
                  value={search}
                  onChange={e => setSearch(e.target.value)}
                  className="pl-9"
                />
              </div>
              <Select value={entityFilter} onValueChange={setEntityFilter}>
                <SelectTrigger className="w-full sm:w-48">
                  <SelectValue placeholder="Entidad" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todas las entidades</SelectItem>
                  <SelectItem value="clients">Clientes</SelectItem>
                  <SelectItem value="loans">Préstamos</SelectItem>
                  <SelectItem value="payments">Pagos</SelectItem>
                  <SelectItem value="penalties">Recargos</SelectItem>
                  <SelectItem value="documents">Documentos</SelectItem>
                  <SelectItem value="legal_consents">Consentimientos</SelectItem>
                  <SelectItem value="settings">Configuración</SelectItem>
                  <SelectItem value="collections">Cobranza</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </CardHeader>
          <CardContent className="p-0">
            {isLoading ? (
              <div className="p-8 text-center text-muted-foreground">Cargando registros...</div>
            ) : filtered.length === 0 ? (
              <div className="p-8 text-center text-muted-foreground">
                <Shield className="h-12 w-12 mx-auto mb-3 text-muted-foreground/30" />
                <p>Sin registros de auditoría</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="border-b bg-muted/30">
                    <tr>
                      <th className="text-left py-3 px-4 font-medium text-muted-foreground">Acción</th>
                      <th className="text-left py-3 px-4 font-medium text-muted-foreground">Entidad</th>
                      <th className="text-left py-3 px-4 font-medium text-muted-foreground">Usuario</th>
                      <th className="text-left py-3 px-4 font-medium text-muted-foreground">IP</th>
                      <th className="text-left py-3 px-4 font-medium text-muted-foreground">Fecha</th>
                      <th className="text-left py-3 px-4 font-medium text-muted-foreground">Detalles</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filtered.map((log) => (
                      <tr key={log.id} className="border-b last:border-0 hover:bg-muted/20">
                        <td className="py-3 px-4">
                          <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${getActionColor(log.action)}`}>
                            {log.action}
                          </span>
                        </td>
                        <td className="py-3 px-4 text-muted-foreground">
                          {log.entity}{log.entityId ? ` #${log.entityId}` : ""}
                        </td>
                        <td className="py-3 px-4 font-medium">{log.userName ?? "—"}</td>
                        <td className="py-3 px-4 font-mono text-xs text-muted-foreground">{log.ipAddress ?? "—"}</td>
                        <td className="py-3 px-4 text-muted-foreground whitespace-nowrap">{formatDateTime(log.createdAt)}</td>
                        <td className="py-3 px-4">
                          {log.newValues != null && (
                            <details className="cursor-pointer">
                              <summary className="text-xs text-primary hover:underline">Ver cambios</summary>
                              <pre className="text-xs bg-muted p-2 rounded mt-1 max-w-xs overflow-auto">
                                {JSON.stringify(log.newValues, null, 2) as string}
                              </pre>
                            </details>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  );
}
