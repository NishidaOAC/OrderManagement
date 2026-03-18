FROM node:20
RUN mkdir /node-app
WORKDIR /node-app
COPY . .
RUN npm i --force
CMD ["npm", "start"]
