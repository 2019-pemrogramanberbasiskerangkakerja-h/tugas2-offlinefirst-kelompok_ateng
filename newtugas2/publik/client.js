var stores = {
    login: [ // One store named 'tasks'.
        ['byCreation', 'createdAt'] // With one index into the 'createdAt' property.
    ],
    accounts: [ // One store named 'tasks'.
        ['byCreation', 'createdAt'] // With one index into the 'createdAt' property.
    ]
};

var db = syncedDB.open({ // Open database.
    name: 'logins',
    version: 1,
    stores: stores,
    remote: '10.151.36.109:8080',
});

//db.sync('accounts', {continuously: true});
db.sync('login', {continuously: true});

document.getElementById('loginform').addEventListener("submit", function(e) {
    e.preventDefault();
    const name = document.getElementById('username').value;
    const pass = document.getElementById('password').value;
    db.accounts.byCreation.getAll().then(function(login) {
        login.forEach(function(log){
            if (log.username == name && log.password == pass){
                console.log ('sukses');
                db.login.put({
                  username : name ,
                  password : pass ,
                  login_status : "sukses",
                  createdAt: Date.now()
                }); 
                window.location = "/home";
            }
        });
    });
    db.login.put({
      username : name ,
      password : pass ,
      login_status : "gagal",
      createdAt: Date.now()
    });
    console.log('login gagal')
    window.location = "/"
});