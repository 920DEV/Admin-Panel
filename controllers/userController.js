const bcrypt = require("bcrypt");

const db = require("../db/database");

const crypto = require("crypto");

const nodemailer = require("nodemailer");

// Generating verification Token 
function generateVerificationToken() 
{
    const token = crypto.randomBytes(32).toString("hex");
    const expires = Date.now() + 24 * 60 * 60 * 1000; // Token valid for 24 hours
    return { token, expires };
}


const myController = {
  // Home Page
  getHome(req, res) {
    const isLoggedIn = req.session.userId && req.session.userName;
    const users = req.session.userName;
    res.render("home", { isLoggedIn, users });
  },

  // Login Page
  getLogin(req, res) {
    if (req.session.userId && req.session.userName) {
      return res.redirect("/");
    }
    res.render("login", { errorMessage:" ", successMessage: "" });
  },

  // Signup Page
  getSignup(req, res) {
    if (req.session.userId && req.session.userName) {
      return res.redirect("/");
    }
    res.render("signup", { errorMessage: "", isLoggedIn: req.session.userId });
  },

  // Admin Page
  getAdmin(req, res) {
    const usersname = req.session.userName;
    res.render("admin", { errorMessage: " ", usersname ,isLoggedIn:""});
  },

  // Get States
  getStates(req, res) {
    const query = "SELECT id,S_name FROM states";
    db.query(query, (err, result) => {
      if (err) {
        console.error("Error fetching states from the db");
        res.status(500).json({ error: "Internal Server Error" });
      } else {
        res.json(result);
      }
    });
  },


  // Get Cities by State Id
  getCities(req, res) {
    const stateId = req.params.stateId;
    const query = "SELECT id, city_name FROM cities WHERE states_id = ?";
    db.query(query, [stateId], (err, results) => {
      if (err) {
        console.error("Error fetching cities from the database:", err);
        res.status(500).json({ error: "Internal Server Error" });
      } else {
        res.json(results);
      }
    });
  },


  // Signup Process
  async signup(req, res) {
    const saltRounds = 10;
    const {name,email,password,state,city} = req.body;

    const { token, expires } = generateVerificationToken(); // Generate a verification token

          

        // validating password 
          const passwordRegex = /^(?=.*[A-Z])(?=.*[!@#$%^&*])[A-Za-z\d!@#$%^&*]{8,}$/;
          if (!passwordRegex.test(password)) {
            res.render("signup", {
              errorMessage:
                "Password must contain at least one capital letter, one special character, and be at least 8 characters long.",
            });
            return;
          }

          else{
          const encryptedPassword = await bcrypt.hash(password, saltRounds);
      db.query(
        "SELECT * FROM users WHERE email = ?",
        [email],
        async (error, result) => {
          if (error) {
            res.status(500).send("Internal server error");
          } 
          else {
            if (result.length > 0) {
              res.render("signup", {
                errorMessage:
                  "Email already exists. Please try with different email.",
              });
            }  
            else {
              let users = {
                name: name, 
                email: email,
                password: encryptedPassword,
                state: state,
                city: city,
              };

              db.query("INSERT INTO users SET ?", users, (error, results) => {
                if (error) {
                  console.log({
                    code: 400,
                    failed: "error occurred",
                    error: error,
                  });
                } 
                else {
                  // Save the token and expiration time in the database
    
                  let verificationData = {
                    email: email,
                    token: token,
                    expires: new Date(expires),
                  };

                  console.log("verification data: " ,verificationData);

                  db.query(
                    "INSERT INTO emailverificaiton SET ?",
                    verificationData,
                    (error, results) => {
                      if (error) {
                        res.status(500).send("Internal server error");
                        console.log({
                          status:500,
                          meassage:"Prolem Occur. Email not sent, Please try agagin",
                        })
                      }
                       else {

                        // setting up the verification link and Mail info
    
                        const verificationLink = `${'http://localhost:3000'}/verify?token=${token}`;
                        const mailOptions = {
                          from: "devc0440@gmail.com",
                          to: email,
                          subject: "Verify your email",
                          html: `<h1>This is a verification link</h1><br><p>Click <a href="${verificationLink}">here</a> to verify your email.</p>`,
                        };
    
                        // for debugging processs
                        console.log("Mail Option",mailOptions);
    
                        // setting up the nodemailer
                      // creating a transporter for sending the mail to the user
    
                      const transporter = nodemailer.createTransport({
                        host: 'smtp.ethereal.email',
                        port: 587,
                        auth: {
                            user: 'vanessa.goldner53@ethereal.email',
                            pass: 'Jkm8r7rb5bRkX64H1v'
                        }
                    });
    
                    // sending the mail
                        transporter.sendMail(mailOptions, (error, info) => {
                          if (error) {
                            console.log("Error sending email:", error);
                            res.status(500).send("Error sending verification email");
                          }
                          else {
                            console.log("Email sent:", info.response);
                            res.render("login", { email: email ,errorMessage:"Please verify your email to continure availing the services"});   // Render a page with a message to check email
                          }
                        });
                      }
                    }
                  );
                }
              });
            }
          }
        }
      );
    }
  },


  // Verify Email
  verifyEmail(req, res) {
    const { token } = req.query;

    const currentTime = new Date();

    console.log(currentTime);
    console.log("token: ",token);

    db.query("SELECT * FROM emailverificaiton WHERE token = ?", [token], (error, results) => {
      if (error || results.length === 0) {
        res.status(400).send("Invalid or expired token");
      } 

      else {
        const dbExpiresTimestamp = new Date(results[0].expires);

        console.log("db_time: ",dbExpiresTimestamp);
  
        if (dbExpiresTimestamp > currentTime) {

          const email = results[0].email;

          db.query("UPDATE users SET is_admin = true WHERE email = ?", [email], (error, results) => {
            if (error) {
              res.status(500).send("Internal server error");
            } else {
              db.query("DELETE FROM emailverificaiton WHERE token = ?", [token], (error, results) => {
                if (error) {
                  console.log("Error deleting verification token:", error);
                }
              });
  
              // Token verification successful
              // res.status(200).send("Verification successful");
              res.render("login",{errorMessage:"Verification Sucessfull! Please Signin "});
            }
          });
        } else {
          res.status(400).send("Expired token");
        }
      }
    });
  },

  // Login Process
  async login(req, res) {
    // Once the user is logged in, they will logged in in other tabs as well, until the session gets over.

    if(req.session.userId && req.session.userName){
        res.redirect("/");
        return ;
    }


    const email = req.body.email;
    const password = req.body.password;
    
    const sql = "SELECT * FROM users WHERE email = ? ";

    db.query(sql,[email],async(err,results)=>{
        if(err){
            throw err;
            // res.render("login",{errorMessage:"Incorrect email or password. Please Try Again"});
        }

        else{
            if(results.length > 0){
                const user = results[0];
                const comparison = await bcrypt.compare(password,results[0].password);
                if(comparison){
                    if(!user.is_admin){
                        res.render("login",{errorMessage:" User is inactive or Unverified. Please Try again "});

                    }
                    else{
                        req.session.userId = results[0].id;
                        req.session.userName = results[0].name;

                        console.log({
                            code: 200,
                            success: "login successful",
                            id: req.session.userId,
                            name: req.session.userName,
                          });
                          res.redirect("/");
                          
                    }

                }
                else {
                    res.render("login", {
                      
                      errorMessage: `Email does not exist. Please try again `,
                    });
                  }
            }
            
        }
    })

  },


  // Admin Page with Pagination
async adminPage(req, res) {
// if the user is not logged in they can't acess the admin page

    if(!req.session.userId || !req.session.userName){
        res.redirect("/login");
        return ;
    }
    const loggedInUserId = req.session.userId || 0;
    const PAGE_SIZE = 5;
    const page = parseInt(req.params.page) || 1;
    const offset = (page - 1) * PAGE_SIZE;
    let search = req.query.search || "";

    const sql = `
    SELECT users.id, users.name, users.email, users.is_admin, states.S_name, cities.city_name
    FROM users 
    LEFT JOIN states ON users.state = states.id
    LEFT JOIN cities ON users.city = cities.id
    WHERE users.name LIKE ? 
    LIMIT ? OFFSET ?
  `; 

    // COUNTING no of users 
    const countSql = "SELECT COUNT(*) as total FROM users WHERE name LIKE ? ";
    
    db.query(countSql, [`%${search}%`], (err, result) => {
        if (err) throw err;
        const totalUsers = result[0].total;
        const totalPages = Math.ceil(totalUsers / PAGE_SIZE);
    
        // Fetch users data for the current page
        db.query(sql, [`%${search}%`, PAGE_SIZE, offset], (err, users) => {
          if (err) throw err;
          // Pass the searc h query, users, and pagination data back to the view
          res.render("admin", {
            users: users,
            currentPage: page,
            search,
            totalPages,
            errorMessage: "",
            isLoggedIn: loggedInUserId,
          });
        });
      });
  },


  // Update User Information
  async updateUser(req, res) {
    const userId = req.params.userId;
    const {newName,newEmail,newState,newCity}= req.body;
    if(isNaN(userId)){
        return res.status(400).send("Invalid Userid ");
    };

    // Getting state and city id fromt the state and city table 

    const getStateidSql = "SELECT id FROM states WHERE S_name = ? ";
    const getCityIdSql = "SELECT id FROM cities WHERE city_name = ? ";
    db.query(getStateidSql,[newState],(err,stateResult)=>{
        if(err){
            console.log(err);
            return res.status(500).send("Error retrieveing state Id");
        }
        db.query(getCityIdSql,[newCity],(err,cityResult)=>{
            if(err){
                console.log(err);
                return res.status(500).send("Error retrieving city id ");

            }
            const newCityId = cityResult[0];
            const newStateId = stateResult[0];

            const sql = "UPDATE users SET name = ? , email = ? , state = ? , city = ? WHERE id = ? ";
            db.query(sql,[newName,newEmail,newCityId,newStateId],(err,result)=>{
                if(err){
                    throw err;
                }
                else{
                    console.log(userId,"state: ", result[0].state,"city: ",result[0].city);
                }
                res.render("admin");
            });
        })
    });
    
  },


  // Deactivate User
  async deactivateUser(req, res) {
    const userId = req.params.userId;
    const loggedInUserId = req.session.userId;


    const sql = "UPDATE user SET is_admin = false, status = false  WHERE id = ?";
    db.query(sql,[userId],(error,result)=>{
        if(error){
            throw error;
        }
        else{
            // If the loggedIn user deactivate themselves it will deactivate the user  and logout form the session.
            if(userId = loggedInUserId){
                res.redirect("/logout");
            }
            res.redirect("/admin/1");
        }
    })
    res.redirect("/admin/1");
  },

  // Activate User
  async activateUser(req, res) {
    const userId = req.params.userId;
    const sql = "UPDATE user SET is_admin = true, status = true WHERE id = ? ";
    db.query(sql,[userId],(error,result)=>{
        if(error){
            throw error;
        }
        else{
            res.redirect("/admin/1"); // redirecting to the admin page after activatig the user;
        }
    })
    res.redirect("/admin/1");
  },

  // Delete User
  async deleteUser(req, res) {

    const userId = req.params.userId;
    const loggedInUserId = req.session.userId; // getting the id of the logged-in user.
  
    // If the logged-in user tries to delete themselves, prevent it
    console.log("condition called",req.params.userId);
    console.log("session id called",req.session.userId);
  
    if (userId === loggedInUserId) {
  
      console.log("Condition called",userId,loggedInUserId);
      return res.render("admin" , loggedInUserId);
      
    }
    else{
      const confirmation = req.body.confirmation;
      console.log(confirmation);
        if (confirmation === "true") {
          const sql = "DELETE FROM users WHERE id = ?";
          // Check if the user confirmed the deletion
          db.query(sql, [userId], (err, result) => {
            if (err) throw err;
            res.redirect("/admin/1"); // Redirect back to the admin page after deleting the user
          });

        } else {
          // If the user canceled the confirmation, redirect back to the admin page without deleting the user
          res.redirect("/admin/1");
        }
    }
  },

  // Logout
  logout(req, res) {
    req.session.destroy((err) => {
      if (err) {
        console.log("Error logging out:", err);
      }
      res.redirect("/login");
      console.log("User Logout");
    });
  },
};

module.exports = myController;
