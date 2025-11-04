FROM node:20-alpine

# Crear directorio de trabajo dentro del contenedor
WORKDIR /app

# Copiar solo package.json y package-lock.json para aprovechar la cache
COPY backend/package*.json ./

# Instalar dependencias
RUN npm install

# Copiar el resto del backend (todo menos node_modules y uploads)
COPY backend .

# Crear directorio para subidas si no existe
RUN mkdir -p uploads && chown node:node uploads

# Usar usuario no root por seguridad
USER node

# Exponer puerto usado por el servidor
EXPOSE 3000

# Ejecutar la app
CMD ["node", "server.js"]
