import OpenAI from 'openai';
import { readFileSync, readdirSync, statSync } from 'fs';
import { join } from 'path';

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

// Função para ler arquivos recursivamente
function readFilesRecursively(dir, fileList = [], baseDir = dir) {
  const files = readdirSync(dir);
  
  files.forEach(file => {
    const filePath = join(dir, file);
    const stat = statSync(filePath);
    
    if (stat.isDirectory()) {
      // Ignorar node_modules, .git, dist, etc
      if (!['node_modules', '.git', 'dist', 'build', '.next'].includes(file)) {
        readFilesRecursively(filePath, fileList, baseDir);
      }
    } else {
      // Apenas arquivos relevantes
      if (file.match(/\.(tsx?|jsx?|sql|md)$/)) {
        const relativePath = filePath.replace(baseDir + '/', '');
        const content = readFileSync(filePath, 'utf-8');
        fileList.push({ path: relativePath, content });
      }
    }
  });
  
  return fileList;
}

async function analyzeProject() {
  console.log('🔍 Iniciando análise do projeto Meu Time...\n');
  
  // Ler arquivos do projeto
  const projectRoot = '/home/ubuntu/meu-time';
  const files = readFilesRecursively(projectRoot);
  
  // Preparar contexto para a IA
  const codeContext = files.map(f => `
=== ${f.path} ===
${f.content}
`).join('\n\n');
  
  // Ler o TODO para verificar o que foi implementado
  const todoContent = readFileSync(join(projectRoot, 'todo.md'), 'utf-8');
  
  console.log(`📁 Analisando ${files.length} arquivos...\n`);
  
  try {
    const response = await openai.chat.completions.create({
      model: 'gpt-4o', // Modelo mais avançado disponível
      messages: [
        {
          role: 'system',
          content: `Você é um especialista em análise de código e arquitetura de software. Sua tarefa é analisar o projeto "Meu Time" - um sistema de gerenciamento de jogos esportivos entre amigos.

O projeto usa:
- Frontend: React 19, TypeScript, Tailwind CSS, Wouter
- Backend: Supabase (Auth, Database, Storage)
- UI: shadcn/ui

Analise PROFUNDAMENTE:
1. Qualidade do código (boas práticas, padrões, organização)
2. Segurança (RLS policies, validações, autenticação)
3. Performance (queries, otimizações, carregamento)
4. Completude (funcionalidades implementadas vs planejadas)
5. Bugs potenciais ou problemas
6. Melhorias necessárias

Seja CRÍTICO e DETALHADO. Liste problemas específicos com exemplos de código.`
        },
        {
          role: 'user',
          content: `Analise este projeto completo:

=== TODO.md (Funcionalidades Planejadas) ===
${todoContent}

=== CÓDIGO DO PROJETO ===
${codeContext}

Forneça uma análise COMPLETA e DETALHADA em português do Brasil, incluindo:

1. **Status de Implementação**: O que foi feito vs o que falta
2. **Problemas Críticos**: Bugs, vulnerabilidades, erros graves
3. **Problemas de Qualidade**: Code smells, más práticas, código duplicado
4. **Problemas de Performance**: Queries ineficientes, re-renders desnecessários
5. **Problemas de Segurança**: Falhas em RLS, validações faltando
6. **Melhorias Recomendadas**: Priorize as 10 mais importantes
7. **Nota Geral**: De 0 a 10, com justificativa

Seja específico, cite trechos de código e arquivos.`
        }
      ],
      temperature: 0.3,
      max_tokens: 4000,
    });
    
    const analysis = response.choices[0].message.content;
    
    console.log('✅ Análise concluída!\n');
    console.log('='.repeat(80));
    console.log(analysis);
    console.log('='.repeat(80));
    
    return analysis;
    
  } catch (error) {
    console.error('❌ Erro ao analisar projeto:', error.message);
    throw error;
  }
}

// Executar análise
analyzeProject().catch(console.error);
