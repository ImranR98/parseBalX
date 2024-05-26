FROM node
COPY . .
RUN npm install
CMD npm start

# docker build -t parsebalx .
# docker run -v ~/Balance.xlsx:/Balance.xlsx parsebalx # Note: Keep this in mind: https://stackoverflow.com/a/52897306
# docker tag parsebalx imranrdev/parsebalx