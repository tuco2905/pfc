######### 15 de outubro de 2024 #########

# SisReBEx

Este documento tem por finalidade orientar desenvolvedores sobre como configurar e inicializar pela primeira vez o projeto de PFC do IME feito junto à D Sau, apelidado internamente de SisReBEx (Sistema de Regulação de Beneficiários do Exército).

## Bibliotecas e frameworks principais

O projeto foi todo feito em Typescript, e utiliza o [Next.JS](https://nextjs.org/) para integrar frontend e backend.

A biblioteca de autenticação utilizada é o [Auth.JS v5](https://authjs.dev/).

Recomenda-se fortemente uma leitura nas fontes indicadas das tecnologias para um entedimento básico de como funcionam.

### Frontend

No frontend os frameworks utilizados são o [React](https://react.dev/) e o [TailwindCSS](https://tailwindcss.com/) em todo o projeto.

Para gerenciar formulários, usa-se o [react-hook-form v7](https://react-hook-form.com/)

### Backend

No backend o principal framework é o [Prisma ORM](https://www.prisma.io/orm), que foi configurado para ser utilizado especialmente com o PostgreSQL, mas outros SGBD podem ser utilizados mediante alterações.

## Configuração do ambiente 

Para todos os comandos que começam com ```sudo```, lembre-se que no Windows não é preciso dele.

### Softwares necessários

É necessário, antes de tudo, a instalação dos seguintes programas e tecnologias nas máquinas que irão rodar localmente o projeto:
- Node.js (versão mais recente, estável)
- Caso o SO da máquina seja Windows, necessário instalar WSL para rodar Docker
- Docker (versão mais recente, estável)
- Uma IDE com suporte para Typescript (recomenda-se o VS Code, porém pode ser outra)

Caso a IDE escolhida seja o VS Code recomenda-se, ainda, a instalação das seguintes extensões, apesar de não obrigatórias, para facilitar a manipulação dos códigos:
- Prisma: adiciona autocomplete, autoformatting e linting para o arquivo .prisma
- Tailwind CSS IntelliSense: adiciona autocomplete e linting para classes Tailwind

### Instalação dos pacotes e bibliotecas

No terminal, garanta que você está no diretório raiz do projeto.
Instale os pacotes necessários com:

```
npm i
```

### Geração de chave do Auth.js

Gere uma chave aleatória que servirá de base para o Auth.js. Isso é feito através do comando:

```
npx auth secret
```

Após isso, um arquivo .env.local será criado com a chave (exemplo: "GPAECXcwF6v8OJNMX7V9TCmNG5H0FM7Sd7xAR3dE5MI=").
Basta copiá-la e substituir o valor da chave AUTH_SECRET no arquivo .env do projeto

### Criação do docker e banco local vazio

Primeiro, inicialize o Docker abrindo-o.
No terminal, crie um container no Docker da seguinte forma:

```
sudo docker run --name PFC -p 8000:5432 -e POSTGRES_USER=postgres -e POSTGRES_PASSWORD=L9HlfOCJQABaMFDL -e POSTGRES_DB=postgres -d postgres
```

A senha do banco, nesse caso, é "L9HlfOCJQABaMFDL". Pode-se mudar, se for preciso. Mas ANOTE a senha pois ela será necessária logo em seguida.

Certifique-se que a variável DATABASE_URL do arquivo .env do projeto é "postgres://postgres:[senha]@localhost:8000/postgres", onde [senha] é a senha do banco que acabou de ser criado.

### Estruturar banco e popular com dados fictícios

No diretório raiz do projeto, execute os comandos abaixo para ler o arquivo ```migration.sql``` dentro da pasta com final _init em prisma/migrations:

```
npx prisma migrate deploy
npx prisma db push
```

Esse arquivo SQL é responsável por criar as tabelas e relações no banco local.

Os dados fictícios e seus scripts estão localizados em prisma/scripts/populate.
Para popular o banco com tais dados, basta executar o seguinte comando, que rodará o script index.ts:

```
npx ts-node prisma/scripts/populate/index.ts
```

Agora seu banco local está devidamente configurado e populado.

## Rodando e utilizando o projeto

Agora com o projeto devidamente configurado, basta executar:

```
npm run dev
```

E o projeto será executado na porta 3000 da máquina.
Para acessá-lo, basta abrir o navegador e ir para a URL "localhost:3000".
O banco de dados local pode ser inspecionado tanto por programas como PGAdmin ou DBeaver; ou então através do Prisma Studio, com o comando:
```npx prisma studio```

## Organização do projeto

### Frontend

Grande parte do código do projeto se encontra nos caminhos "src/components" e "pages/" (à exceção de pages/api).

A pasta "pages/" possui todas as páginas da aplicação, e seu caminho dita a rota (URL) para acessá-la. (por exemplo: o arquivo "pages/solicitacoes/index.tsx" cria a página "[domínio]/solicitacoes" e o arquivo "pages/solicitações/criar.tsx" cria a página "[dominio]/solicitacoes/criar". No caso do projeto local, o domínio é localhost:3000)

A pasta "src/components" possui todos os componentes definidos no projeto e usados nas páginas. Em especial, o caminho "src/components/common" elenca os componentes genéricos para serem reaproveitados e ter usos específicos em outro lugar.

### Backend
