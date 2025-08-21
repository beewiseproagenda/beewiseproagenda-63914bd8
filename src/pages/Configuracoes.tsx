import React from "react";
import { useTheme } from "next-themes";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Sun, Moon, Monitor } from "lucide-react";

const Configuracoes: React.FC = () => {
  const { theme, setTheme } = useTheme();

  return (
    <div className="p-6 space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Configurações</h1>
        <p className="text-muted-foreground">
          Personalize sua experiência no sistema
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Sun className="h-5 w-5" />
            Preferências de Tema
          </CardTitle>
          <CardDescription>
            Escolha entre o modo claro, escuro ou automático baseado no seu sistema
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <Sun className="h-4 w-4 text-primary" />
                <Label htmlFor="light-mode" className="font-medium">
                  Modo Claro
                </Label>
              </div>
              <Switch
                id="light-mode"
                checked={theme === "light"}
                onCheckedChange={() => setTheme("light")}
              />
            </div>

            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <Moon className="h-4 w-4 text-primary" />
                <Label htmlFor="dark-mode" className="font-medium">
                  Modo Escuro
                </Label>
              </div>
              <Switch
                id="dark-mode"
                checked={theme === "dark"}
                onCheckedChange={() => setTheme("dark")}
              />
            </div>

            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <Monitor className="h-4 w-4 text-primary" />
                <Label htmlFor="system-mode" className="font-medium">
                  Automático (Sistema)
                </Label>
              </div>
              <Switch
                id="system-mode"
                checked={theme === "system"}
                onCheckedChange={() => setTheme("system")}
              />
            </div>
          </div>

          <div className="border-t pt-4">
            <p className="text-sm text-muted-foreground">
              O tema automático segue a preferência do seu sistema operacional.
              As cores principais do sistema são mantidas para preservar a identidade visual.
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default Configuracoes;