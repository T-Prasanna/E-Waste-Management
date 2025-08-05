var express = require("express");
var app = express();
var bodyParser = require("body-parser");
var mongoose = require("mongoose");

 // To suppress Mongoose deprecation warning
mongoose.connect("mongodb+srv://prasannateemara:MySecurePass123@ewaste.iljk5jn.mongodb.net/Ewaste?retryWrites=true&w=majority&appName=ewaste", {
  useNewUrlParser: true,
  useUnifiedTopology: true
});


var ip = "127.0.0.1";
var port = 3000;

app.use(bodyParser.urlencoded({ extended: true }));
app.set("view engine", "ejs");
app.use(express.static("public"));

// SCHEMA SETUP
var employeeSchema = new mongoose.Schema({
  username: String,
  password: String,
  applicant: String,
  email: String
});
var Employee = mongoose.model("Employee", employeeSchema);

var itemSchema = new mongoose.Schema({
  type: String,
  email: String,
  image: String,
  quantity: Number,
  price: String,
  info: String,
  sold: Boolean
});
var Item = mongoose.model("Item", itemSchema);

var paymentSchema = new mongoose.Schema({
  item_id: { type: mongoose.Schema.Types.ObjectId, ref: "Item" },
  employee_id: { type: mongoose.Schema.Types.ObjectId, ref: "Employee" },
  cardHolder: String,
  email: String,
  cardNo: String,
  created: { type: Date, default: Date.now }
});
var Payment = mongoose.model("Payment", paymentSchema);

app.get("/", (req, res) => res.render("base"));

app.get("/employees/new", (req, res) => res.render("login"));

app.get("/myAccount/:id", async (req, res) => {
  try {
    const employee = await Employee.findById(req.params.id);
    if (!employee) return res.status(404).send("Employee not found");
    const items = await Item.find({});
    const view = employee.applicant === "Customer" ? "customer" : "admin";
    res.render(view, { employee, items });
  } catch (err) {
    console.log(err);
    res.status(500).send("Server Error");
  }
});

app.post("/validate", async (req, res) => {
  const { username, password, applicant } = req.body;
  try {
    const employees = await Employee.find({});
    const employee = employees.find(emp => emp.username === username && emp.password === password && emp.applicant === applicant);
    if (employee) {
      const items = await Item.find({});
      const view = applicant === "Customer" ? "customer" : "admin";
      res.render(view, { employee, items });
    } else {
      res.render("error", { error_msg: "User Not Found" });
    }
  } catch (err) {
    console.log(err);
    res.status(500).send("Server Error");
  }
});

app.get("/reg", (req, res) => res.render("registration"));

app.post("/employees", async (req, res) => {
  const { username, password, confirm_password, applicant, email } = req.body;
  let error_msg = "";
  try {
    const existing = await Employee.findOne({ username });
    if (existing) {
      error_msg += "Username Already Exists.\n";
    }
    if (password !== confirm_password) error_msg += "Password and Confirm-Password are not same.\n";
    if (username.length < 8 || password.length < 8) error_msg += "Username/Password should contain at least 8 characters.\n";
    if (email.length < 8) error_msg += "Email is too short.\n";

    if (error_msg === "") {
      await Employee.create({ username, password, applicant, email });
      res.redirect("/");
    } else {
      res.render("error", { error_msg });
    }
  } catch (err) {
    console.log(err);
    res.status(500).send("Server Error");
  }
});

const renderCategory = (viewName) => async (req, res) => {
  try {
    const employee = await Employee.findById(req.params.id);
    const items = await Item.find({});
    res.render(viewName, { employee, items });
  } catch (err) {
    console.log(err);
  }
};

app.get("/mobiles/:id", renderCategory("show_mobile"));
app.get("/laptops/:id", renderCategory("show_laptop"));
app.get("/others/:id", renderCategory("show_others"));

app.get("/items", (req, res) => res.redirect("/"));

app.get("/items/new/:id", async (req, res) => {
  try {
    const employee = await Employee.findById(req.params.id);
    res.render("add_items.ejs", { employee });
  } catch (err) {
    console.log(err);
  }
});

app.get("/items/:id", async (req, res) => {
  const [item_id, employee_id] = req.params.id.split("_");
  try {
    const foundItem = await Item.findById(item_id);
    const employee = await Employee.findById(employee_id);
    res.render("show", { employee, foundItem });
  } catch (err) {
    console.log(err);
  }
});

app.post("/items/:id", async (req, res) => {
  const newItem = { ...req.body, sold: false };
  await Item.create(newItem);
  res.redirect("/items/new/" + req.params.id);
});

app.get("/myItems/:id", async (req, res) => {
  try {
    const employee = await Employee.findById(req.params.id);
    const items = await Item.find({});
    res.render("item_list", { employee, items });
  } catch (err) {
    console.log(err);
  }
});

app.get("/items/:id/edit", async (req, res) => {
  try {
    const foundItem = await Item.findById(req.params.id);
    res.render("edit", { foundItem });
  } catch (err) {
    console.log(err);
  }
});

app.post("/updateItem/:id", async (req, res) => {
  try {
    const item = await Item.findByIdAndUpdate(req.params.id, req.body.item);
    const employee = await Employee.findOne({ email: item.email });
    res.redirect("/myItems/" + employee._id);
  } catch (err) {
    console.log(err);
  }
});

const deleteItem = (redirectPath) => async (req, res) => {
  const [item_id, employee_id] = req.params.id.split("_");
  try {
    await Item.findByIdAndRemove(item_id);
    const employee = await Employee.findById(employee_id);
    const items = await Item.find({});
    res.render(redirectPath, { employee, items });
  } catch (err) {
    console.log(err);
  }
};

app.get("/deleteItem/:id", async (req, res) => {
  const [, employee_id] = req.params.id.split("_");
  await Item.findByIdAndRemove(req.params.id.split("_")[0]);
  res.redirect("/myAccount/" + employee_id);
});

app.get("/deleteItemFromItemList/:id", deleteItem("item_list"));

app.get("/payments", async (req, res) => {
  const payments = await Payment.find({});
  res.render("show_payment.ejs", { payments });
});

app.get("/payments/:id", async (req, res) => {
  const [item_id, employee_id] = req.params.id.split("_");
  const newPayment = await Payment.create({ item_id, employee_id });
  await Item.findByIdAndUpdate(item_id, { sold: true });
  res.render("payment.ejs", { newPayment });
});

app.post("/payments/:id", async (req, res) => {
  const updated = await Payment.findByIdAndUpdate(req.params.id, req.body);
  res.render("done_payment.ejs", { payment: updated });
});

app.get("/show_payment/:id", async (req, res) => {
  const payment = await Payment.findById(req.params.id);
  const item = await Item.findById(payment.item_id);
  res.render("show_payment_details.ejs", { payment, item });
});

app.get("/reports", async (req, res) => {
  const payments = await Payment.find({});
  const items = await Item.find({});
  res.render("report.ejs", { payments, items });
});

app.listen(port, ip, () => {
  console.log("Server has started !");
});
