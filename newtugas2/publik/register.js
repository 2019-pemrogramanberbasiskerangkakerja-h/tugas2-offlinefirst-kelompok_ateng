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

//db.sync('login', {continuously: true});
db.sync('accounts', {continuously: true});

document.getElementById('registerform').addEventListener("submit", function(e) {
    e.preventDefault();
    const name = document.getElementById('username').value;
    const pass = document.getElementById('password').value;
    db.accounts.put({
        username : name ,
        password : pass ,
        createdAt: Date.now()
    }); 
    console.log('user added');
    window.location = "/";
});