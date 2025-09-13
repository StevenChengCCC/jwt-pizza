# Learning notes

## JWT Pizza code study and debugging

As part of `Deliverable ⓵ Development deployment: JWT Pizza`, start up the application and debug through the code until you understand how it works. During the learning process fill out the following required pieces of information in order to demonstrate that you have successfully completed the deliverable.

| User activity                                       | Frontend component | Backend endpoints | Database SQL |
| --------------------------------------------------- | ------------------ | ----------------- | ------------ |
| View home page                                      |      Home.jsx      |       none        |     none     |
| Register new user<br/>(t@jwt.com, pw: test)         |      Register.jsx  | [POST] /api/auth  |     INSERT INTO user (name, email, password) VALUES (?, ?, ?) <br/> INSERT INTO userRole (userId, role, objectId) VALUES (?, ?, ?)         |
| Login new user<br/>(t@jwt.com, pw: test)            |      Login.jsx     | [PUT] /api/auth   |     SELECT id, name, email, password FROM user WHERE email = ? <br/> SELECT role, objectId FROM userRole WHERE userId = ?        |
| Order pizza                                         |      Order.jsx     |[GET] /api/order/menu <br/> [POST] /api/order |     SELECT id, name, price FROM menuItem WHERE isActive = 1 <br/> INSERT INTO orders (userId, total, jwt) VALUES (?, ?, ?) <br/> INSERT INTO orderItem (orderId, menuItemId, qty, price) VALUES (?, ?, ?, ?)         |
| Verify pizza                                        |      Verify.jsx    |[POST] /api/order/verify|   none   |
| View profile page                                   |      Profile.jsx   |[GET] /api/profile| SELECT id, name, email, createdAt FROM user WHERE id = ? <br/> SELECT role, objectId FROM userRole WHERE userId = ? |
| View franchise<br/>(as diner)                       |      Franchise.jsx |[GET] /api/franchise|  SELECT id, name, status FROM franchise WHERE status = 'open' <br/> SELECT id, franchiseId, name, status FROM store WHERE franchiseId IN (?) AND status = 'open'  |
| Logout                                              |      Logout.jsx    |       none        |     none     |
| View About page                                     |      About.jsx     |       none        |     none     |
| View History page                                   |      History.jsx   |[GET] /api/order/history| SELECT id, total, createdAt FROM orders WHERE userId = ? ORDER BY createdAt DESC <br/> SELECT orderId, menuItemId, qty, price FROM orderItem WHERE orderId IN (?) |
| Login as franchisee<br/>(f@jwt.com, pw: franchisee) |      Login.jsx     |[PUT] /api/auth    | SELECT id, name, email, password FROM user WHERE email = ? <br/> SELECT role, objectId FROM userRole WHERE userId = ? |
| View franchise<br/>(as franchisee)                  |      Franchise.jsx | [GET] /api/franchise/mine <br/> [GET] /api/franchise/:franchiseId/stores | SELECT f.id, f.name, f.status FROM franchise f JOIN userRole ur ON ur.objectId = f.id AND ur.role = 'franchise' WHERE ur.userId = ? <br/> SELECT id, franchiseId, name, status FROM store WHERE franchiseId = ?|
| Create a store                                      |      Franchise.jsx |[POST] /api/franchise/:franchiseId/store | INSERT INTO store (franchiseId, name, status) VALUES (?, ?, 'open') |
| Close a store                                       |      Franchise.jsx |[PUT] /api/store/:storeId/close| UPDATE store SET status = 'closed' WHERE id = ? |
| Login as admin<br/>(a@jwt.com, pw: admin)           |      Login.jsx     |[PUT] /api/auth|SELECT id, name, email, password FROM user WHERE email = ? <br/> SELECT role, objectId FROM userRole WHERE userId = ?|
| View Admin page                                     |      Admin.jsx     |[GET] /api/franchise <br/> [GET] /api/users| SELECT id, name, status FROM franchise <br/> SELECT id, name, email FROM user |
| Create a franchise for t@jwt.com                    |      Admin.jsx     | [POST] /api/franchise |INSERT INTO franchise (name, status) VALUES (?, 'open') <br/> SELECT id FROM user WHERE email = ? <br/> INSERT INTO userRole (userId, role, objectId) VALUES (?, 'franchise', ?)|
| Close the franchise for t@jwt.com                   |      Admin.jsx     | [PUT] /api/franchise/:franchiseId/close|UPDATE franchise SET status = 'closed' WHERE id = ? <br/> UPDATE store SET status = 'closed' WHERE franchiseId = ?|
