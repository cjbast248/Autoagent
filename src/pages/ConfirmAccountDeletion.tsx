import { useEffect, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Loader2, CheckCircle2, XCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

const ConfirmAccountDeletion = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const [status, setStatus] = useState<"loading" | "success" | "error">("loading");
  const [message, setMessage] = useState("");

  useEffect(() => {
    const confirmDeletion = async () => {
      const token = searchParams.get("token");

      if (!token) {
        setStatus("error");
        setMessage("Token lipsă sau invalid");
        return;
      }

      try {
        const { data, error } = await supabase.functions.invoke(
          "confirm-account-deletion",
          {
            body: { token },
          }
        );

        if (error) throw error;

        if (data.success) {
          setStatus("success");
          setMessage("Contul tău a fost șters cu succes");
          
          // Sign out and redirect after 3 seconds
          setTimeout(async () => {
            await supabase.auth.signOut();
            navigate("/");
          }, 3000);
        } else {
          throw new Error(data.error || "Eroare la ștergerea contului");
        }
      } catch (error: any) {
        console.error("Error confirming deletion:", error);
        setStatus("error");
        setMessage(error.message || "A apărut o eroare la ștergerea contului");
      }
    };

    confirmDeletion();
  }, [searchParams, navigate]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <div className="flex justify-center mb-4">
            {status === "loading" && (
              <Loader2 className="h-12 w-12 animate-spin text-primary" />
            )}
            {status === "success" && (
              <CheckCircle2 className="h-12 w-12 text-green-500" />
            )}
            {status === "error" && (
              <XCircle className="h-12 w-12 text-destructive" />
            )}
          </div>
          <CardTitle>
            {status === "loading" && "Procesăm cererea..."}
            {status === "success" && "Cont șters cu succes"}
            {status === "error" && "Eroare"}
          </CardTitle>
          <CardDescription>{message}</CardDescription>
        </CardHeader>
        <CardContent className="flex justify-center">
          {status === "error" && (
            <Button onClick={() => navigate("/")}>
              Înapoi la pagina principală
            </Button>
          )}
          {status === "success" && (
            <p className="text-sm text-muted-foreground">
              Vei fi redirecționat în câteva secunde...
            </p>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default ConfirmAccountDeletion;
