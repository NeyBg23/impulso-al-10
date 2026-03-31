import { useState } from "react";
import DashboardLayout from "@/components/DashboardLayout";
import { trpc } from "@/lib/trpc";
import { formatDate, DOC_TYPE_LABELS } from "@/lib/format";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import { Upload, FileText, Trash2 } from "lucide-react";

export default function Documents() {
  const [selectedClientId, setSelectedClientId] = useState("");
  const [showUploadDialog, setShowUploadDialog] = useState(false);
  const [uploadForm, setUploadForm] = useState({
    type: "id_front" as "id_front" | "id_back" | "selfie" | "receipt" | "contract" | "other",
    description: "",
    file: null as File | null,
  });

  const utils = trpc.useUtils();
  const { data: clients = [] } = trpc.clients.list.useQuery({});
  const { data: documents = [], isLoading } = trpc.documents.byClient.useQuery(
    { clientId: parseInt(selectedClientId) },
    { enabled: !!selectedClientId }
  );

  const uploadMutation = trpc.documents.upload.useMutation({
    onSuccess: () => {
      toast.success("Documento subido exitosamente");
      utils.documents.byClient.invalidate({ clientId: parseInt(selectedClientId) });
      setShowUploadDialog(false);
      setUploadForm({ type: "id_front", description: "", file: null });
    },
    onError: (e) => toast.error(e.message),
  });

  const deleteMutation = trpc.documents.delete.useMutation({
    onSuccess: () => {
      toast.success("Documento eliminado");
      utils.documents.byClient.invalidate({ clientId: parseInt(selectedClientId) });
    },
    onError: (e) => toast.error(e.message),
  });

  const handleUpload = async () => {
    if (!uploadForm.file || !selectedClientId) return;
    const reader = new FileReader();
    reader.onload = (e) => {
      const base64 = (e.target?.result as string).split(",")[1];
      uploadMutation.mutate({
        clientId: parseInt(selectedClientId),
        type: uploadForm.type,
        fileName: uploadForm.file!.name,
        fileBase64: base64,
        mimeType: uploadForm.file!.type,
        fileSize: uploadForm.file!.size,
        description: uploadForm.description || null,
      });
    };
    reader.readAsDataURL(uploadForm.file);
  };

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold tracking-tight">Documentos</h1>
            <p className="text-muted-foreground text-sm mt-1">Gestión de documentos por cliente</p>
          </div>
          {selectedClientId && (
            <Button onClick={() => setShowUploadDialog(true)}>
              <Upload className="mr-2 h-4 w-4" />
              Subir documento
            </Button>
          )}
        </div>

        <Card>
          <CardHeader className="pb-3">
            <div>
              <Label>Seleccionar cliente</Label>
              <Select value={selectedClientId} onValueChange={setSelectedClientId}>
                <SelectTrigger className="mt-1.5">
                  <SelectValue placeholder="Seleccione un cliente para ver sus documentos..." />
                </SelectTrigger>
                <SelectContent>
                  {clients.map(c => (
                    <SelectItem key={c.id} value={String(c.id)}>
                      {c.fullName} — {c.documentType} {c.documentNumber}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </CardHeader>
          <CardContent>
            {!selectedClientId ? (
              <div className="py-8 text-center text-muted-foreground">Seleccione un cliente para ver sus documentos</div>
            ) : isLoading ? (
              <div className="py-8 text-center text-muted-foreground">Cargando documentos...</div>
            ) : documents.length === 0 ? (
              <div className="py-8 text-center text-muted-foreground">
                <FileText className="h-12 w-12 mx-auto mb-3 text-muted-foreground/30" />
                <p>Sin documentos subidos para este cliente</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                {documents.map(doc => (
                  <div key={doc.id} className="border rounded-lg p-4 hover:bg-muted/20 transition-colors">
                    <div className="flex items-start justify-between mb-2">
                      <div className="flex items-center gap-2">
                        <FileText className="h-4 w-4 text-muted-foreground shrink-0" />
                        <span className="text-xs font-medium bg-muted px-1.5 py-0.5 rounded">
                          {DOC_TYPE_LABELS[doc.type] ?? doc.type}
                        </span>
                      </div>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-7 w-7 p-0 text-destructive hover:text-destructive"
                        onClick={() => deleteMutation.mutate({ id: doc.id })}
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </Button>
                    </div>
                    <a href={doc.fileUrl} target="_blank" rel="noopener noreferrer"
                      className="text-sm font-medium hover:underline text-primary truncate block">
                      {doc.fileName}
                    </a>
                    {doc.description && <p className="text-xs text-muted-foreground mt-1">{doc.description}</p>}
                    <p className="text-xs text-muted-foreground mt-2">{formatDate(doc.createdAt)}</p>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      <Dialog open={showUploadDialog} onOpenChange={setShowUploadDialog}>
        <DialogContent>
          <DialogHeader><DialogTitle>Subir Documento</DialogTitle></DialogHeader>
          <div className="space-y-4 py-2">
            <div>
              <Label>Tipo de documento *</Label>
              <Select value={uploadForm.type} onValueChange={v => setUploadForm(f => ({ ...f, type: v as typeof uploadForm.type }))}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {Object.entries(DOC_TYPE_LABELS).map(([value, label]) => (
                    <SelectItem key={value} value={value}>{label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Archivo *</Label>
              <Input
                type="file"
                accept="image/*,application/pdf"
                onChange={e => setUploadForm(f => ({ ...f, file: e.target.files?.[0] ?? null }))}
              />
            </div>
            <div>
              <Label>Descripción</Label>
              <Textarea value={uploadForm.description} onChange={e => setUploadForm(f => ({ ...f, description: e.target.value }))} rows={2} placeholder="Descripción opcional..." />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowUploadDialog(false)}>Cancelar</Button>
            <Button onClick={handleUpload} disabled={uploadMutation.isPending || !uploadForm.file}>
              {uploadMutation.isPending ? "Subiendo..." : "Subir documento"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </DashboardLayout>
  );
}
