# GeoStore

An attempt to automate common graph-related tasks on top of OSM-data.

##Setup

###sending session-secrets via email
create a file called 'email_config.json' and place it inside the 'assets' folder.
This file must contain a JSON-Object describing the configuration of the [nodemailer-dependency][1].
This object will be used as the *transport*-input to `NodeMailer.createTransport` ([see here](https://github.com/nodemailer/nodemailer#setting-up)).

[1]: https://github.com/nodemailer/nodemailer
```json
{
    "host": "smtp.uni-kl.de",
    "port": 465,
    "secure": true,
    "auth": {
        "user": "###@rhrk.uni-kl.de",
        "pass": "###"
    },
    "sender": "GeoStore <info@geo.store>"
}
```


### listing known users
create a file called 'users.json' at the top level and fill it with an array of email addresses.
Only addresses listed here are allowed to be used to login.

```json
["melissa@geo.store","ann@geo.store","bob@geo.store"]
```
