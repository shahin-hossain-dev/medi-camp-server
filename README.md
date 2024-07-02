# This is backend of Medical Camp project

## How to run this project locally
If you run this project locally you hove to must follow frontend instruction first. [click here](https://github.com/shahin-hossain-dev/medi-camp-client)

follow these stpes below 
step 1: You have to clone this repository to your local machine open your command terminal 

```bash
git clone https://github.com/shahin-hossain-dev/medi-camp-server.git
```

step 2: Open the project on your code base make .env file in the root of your project folder and you need some credentials 
- mongoDB database user & password
- DB_USER=username, DB_PASS=password
- ACCESS_SECRET_TOKEN=any token id
- optional: stripe STRIPE_SECRET_KEY=secret key

step 3: 
- change mongoDB uri link, you paste your own uri
- install nodemon globally

```bash
npm i nodemon
```
- then run the project

```bash
nodemon index.js
```


## Enjoy
