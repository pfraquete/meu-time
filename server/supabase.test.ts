import { describe, expect, it } from "vitest";
import { supabase, supabaseAdmin } from "./supabase";

describe("Supabase Connection", () => {
  it("should connect to Supabase and verify credentials", async () => {
    // Testa se as credenciais estão configuradas
    expect(process.env.VITE_SUPABASE_URL).toBeDefined();
    expect(process.env.VITE_SUPABASE_ANON_KEY).toBeDefined();
    
    // Testa conexão básica fazendo uma query simples
    const { data, error } = await supabase.from('profiles').select('count').limit(1);
    
    // Se a tabela não existir ainda, o erro será específico
    // Se as credenciais estiverem erradas, teremos erro de autenticação
    if (error) {
      // Erro de tabela não encontrada é OK (ainda não criamos o schema)
      // Erro de autenticação não é OK
      expect(error.code).not.toBe('PGRST301'); // JWT error
      expect(error.message).not.toContain('JWT');
      expect(error.message).not.toContain('authentication');
    } else {
      // Se não houver erro, a conexão está OK
      expect(data).toBeDefined();
    }
  });

  it("should have admin client configured", () => {
    expect(supabaseAdmin).toBeDefined();
  });
});
