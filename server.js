const express  = require("express");
const app = express();
const PORT = 8080;
const path = require("path");


app.set("view engine", "ejs");
app.set("views", path.join(__dirname, "views"));
app.use(express.static(path.join(__dirname,"public")));

app.get("/",(req,res)=>{
    res.redirect("/home");
})

app.get("/home",(req,res)=>{
    res.render("index");
})

app.get("/blogs",(req,res)=>{
    res.render("blogs");
})

app.get("/about",(req,res)=>{
    res.render("about");
})

app.get("/corporate",(req,res)=>{
    res.render("corporate");
})

app.get("/menu",(req,res)=>{
    res.render("menu");
})

app.listen(PORT, ()=>{
    console.log(`Listening to PORT : ${PORT}`);
})