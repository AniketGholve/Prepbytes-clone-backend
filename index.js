const express = require('express');
const app = express();
const cors = require("cors")
const bodyParser = require('body-parser')
const bcrypt = require('bcrypt')
const saltRoute = 10;
const { conn, dbCreation } = require('./config/db');
const userCollection = dbCreation.collection("userData");
const enquiry = dbCreation.collection("enquiry");
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
let purchaseCourse = {}
app.post("/create-checkout-session", async (req, res) => {
    const { products } = req.body;
    const { email } = req.body
    console.log(req.body.email)
    if (email === undefined) {
        res.json({ "err": "user email missing" })
    }
    purchaseCourse = products
    const lineItems = [products].map((product) => ({
        price_data: {
            currency: "inr",
            product_data: {
                name: product.name,
                images: [product.url]
            },
            unit_amount: product.price * 100
        },
        quantity: product.quantity
    }))
    const session = await stripe.checkout.sessions.create({
        payment_method_types: ["card"],
        line_items: lineItems,
        mode: 'payment',
        success_url: "https://prepbytes-clone-yczy.onrender.com/order/success?session_id={CHECKOUT_SESSION_ID}&email=" + email,
        cancel_url: `https://prepbytes-clone-1.netlify.app/master-competitive-programming`,
    });

    res.json({ id: session.id, "session": session })
})

app.get("/order/success", async (req, res) => {
    let email = req.query.email
    let checkUser = await userCollection.findOne({ "email": email })
    if (checkUser) {
        let data = {}
        console.log(purchaseCourse)
        checkUser.course ?
            data = {
                ...checkUser,
                "course": [...checkUser.course, purchaseCourse]
            } : data = {
                ...checkUser,
                "course": [purchaseCourse]
            }
        console.log(data)
        try {
            await userCollection.updateOne({ "email": email }, { $push: { "course": purchaseCourse } }, (err, result) => {
                if (err) {
                    console.log(err);
                } else {
                    console.log(result);
                }
            });

        }
        catch (e) {
            console.log(e)
        }
    }
    res.redirect("https://prepbytes-clone-1.netlify.app/dashboard")
})

app.post("/getCourseOfUser", async (req, res) => {
    let email = req.body.email;
    let checkUser = await userCollection.findOne({ "email": email })
    res.json(checkUser)
})
app.post("/sendEnquiryData", async (req, res) => {
    try{
        console.log(req.body)
        await enquiry.insertOne(req.body)
        res.status(200).send("Enquiry Send to host")
    }catch(e){
        res.status(500)
    }


})
app.listen(3000, async () => {
    try {
        await conn()
        console.log("server started on port 3000")
    } catch (e) {
        console.log("err")
    }
})