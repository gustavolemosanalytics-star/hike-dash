# Hike Dashboard

Dashboard financeiro moderno construído com Next.js, React e TypeScript.

## 🚀 Getting Started

### Desenvolvimento Local

Primeiro, instale as dependências:

```bash
npm install
```

Execute o servidor de desenvolvimento:

```bash
npm run dev
```

Abra [http://localhost:3000](http://localhost:3000) no seu navegador para ver o resultado.

### Build de Produção

Para criar uma build de produção:

```bash
npm run build
```

Para executar a build de produção localmente:

```bash
npm start
```

## 📦 Deploy no Vercel

### Passo 1: Criar Conta no Vercel

1. Acesse [vercel.com](https://vercel.com)
2. Crie uma conta ou faça login

### Passo 2: Conectar Repositório

1. No dashboard do Vercel, clique em "Add New Project"
2. Importe seu repositório do GitHub/GitLab/Bitbucket
3. Ou faça deploy direto via Vercel CLI:

```bash
npm i -g vercel
vercel
```

### Passo 3: Configurar Variáveis de Ambiente (se necessário)

1. No dashboard do projeto no Vercel, vá em "Settings" > "Environment Variables"
2. Adicione as variáveis necessárias (veja `.env.example`)

### Passo 4: Deploy

O Vercel fará deploy automaticamente:
- **Production**: Quando você fizer push para a branch `main`
- **Preview**: Para cada pull request

## 🛠️ Tecnologias

- **Framework**: Next.js 15
- **Linguagem**: TypeScript
- **Estilização**: Tailwind CSS
- **Animações**: Framer Motion
- **Gráficos**: Recharts
- **Datas**: date-fns, react-day-picker

## 📁 Estrutura do Projeto

```
hike-dash/
├── src/
│   ├── app/              # Pages e rotas (App Router)
│   ├── components/       # Componentes React
│   │   ├── ui/          # Componentes de UI reutilizáveis
│   │   └── ...          # Componentes de páginas
│   └── lib/             # Utilitários e helpers
├── public/              # Arquivos estáticos
└── ...
```

## 📝 Scripts Disponíveis

- `npm run dev` - Inicia servidor de desenvolvimento
- `npm run build` - Cria build de produção
- `npm start` - Executa build de produção
- `npm run lint` - Executa linter

## 🔧 Configuração

### Variáveis de Ambiente

Copie `.env.example` para `.env.local` e configure as variáveis necessárias.

## 📄 Licença

Este projeto é privado e proprietário.
