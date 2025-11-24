FROM node:20-alpine

WORKDIR /app

RUN apk add --no-cache python3 make g++ bash

# Copy package.json untuk install dependencies
COPY package*.json ./
RUN npm install --production

# Copy seluruh source
COPY . .

RUN mkdir -p public/uploads

EXPOSE 5000

ENV NODE_ENV=production

CMD ["npm", "start"]
