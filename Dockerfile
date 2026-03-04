# 1. Usa uma imagem leve do Node.js (Linux Alpine)
FROM node:20-alpine

# 2. Cria a pasta da aplicação dentro do container
WORKDIR /usr/src/app

# 3. Copia apenas os arquivos de dependências primeiro
# Isso acelera a construção do container
COPY package*.json ./

# 4. Instala as dependências (dentro do ambiente Linux do container)
RUN npm install --production

# 5. Copia o restante dos arquivos do seu projeto
COPY . .

# 6. Informa que a aplicação usa a porta 3000
EXPOSE 3000

# 7. Comando para iniciar o servidor
CMD [ "node", "server.js" ]