FROM node:20-slim

WORKDIR /app

# Copy package descriptors and install dependencies
COPY package*.json /app/
RUN npm install

# Copy application source code
COPY . /app/

EXPOSE 5173

CMD ["npm", "run", "dev", "--", "--host", "0.0.0.0", "--port", "5173"]
