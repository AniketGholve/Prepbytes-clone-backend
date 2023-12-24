const express = require('express');
const app = express();
const cors = require("cors")
const bodyParser = require('body-parser')
const bcrypt = require('bcrypt')
const saltRoute = 10;
const { conn, dbCreation } = require('./config/db');
const userCollection = dbCreation.collection("userData");
let data = []
app.use(cors({
    origin: "*"
}))
app.use(bodyParser.json())
const stripe = require("stripe")("sk_test_51OLfmRSFBQcGNae0CsRazZrCqQDnTzwG7ftdKB3RKdPfbJ0f4jZa0Voydeqpb2jgHEBKEKUepRR6Pr7nbsYMdy7k00b9yG9oCG")
app.post("/register", async (req, res) => {
    let jsonData = JSON.stringify(req.body);
    let convertedJson = JSON.parse(jsonData)
    const value = bcrypt.hashSync(convertedJson.password, saltRoute)
    convertedJson.password = value;
    let checkUser = await userCollection.findOne({ "email": convertedJson.email })
    if (!checkUser) {
        userCollection.insertOne(convertedJson);
        return res.status(200).send({ msg: "User Successfully registered" });
    }
    return res.status(403).send({ err: "user exist" })
})
app.post("/login", async (req, res) => {
    let jsonData = JSON.stringify(req.body);
    let convertedJson = JSON.parse(jsonData)
    let checkUser = await userCollection.findOne({ "email": convertedJson.email })
    if (!checkUser) {
        return res.status(400).send({ err: "Invalid User" })
    }
    console.log(convertedJson)
    const validate = bcrypt.compareSync(convertedJson.password, checkUser.password);
    if (validate) {
        return res.send({ msg: "Login Success", username: checkUser.name });
    }
    else {
        console.log(data)
        return res.send({ err: "Invalid User" })
    }
})

app.post("/create-checkout-session", async (req, res) => {
    const { products } = req.body;
    const lineItems = products.map((product) => ({
        price_data: {
            currency: "usd",
            product_data: {
                name: product.name,
                images: [product.url]
            },
            unit_amount: product.price.split("$")[1]*100
        },
        quantity:product.quantity
    }))
    const session = await stripe.checkout.sessions.create({
        payment_method_types:["card"],
        line_items: lineItems,
        mode: 'payment',
        success_url: `https://ecommerce-react01.netlify.app/success`,
        cancel_url: `https://ecommerce-react01.netlify.app/cartdetails`,
    });

    res.json({id:session.id})
})
app.listen(3000, async () => {
    try {
        await conn()
        console.log("server started on port 3000")
    } catch (e) {
        console.log("err")
    }
})