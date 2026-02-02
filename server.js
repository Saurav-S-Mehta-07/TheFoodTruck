const express  = require("express");
const app = express();
const PORT = 8080;

app.get("/",(req,res)=>{
    res.redirect("/home")
})

app.get("/home",(req,res)=>{
   res.send("home");
})

app.get("/order",(req,res)=>{
    res.send("Order");
})

app.listen(PORT, ()=>{
    console.log(`Listening to PORT : ${PORT}`);
})