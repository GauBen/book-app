## Installation

```bash
$ npm install
```

## Start the app

```bash
# development
$ npm run start

# watch mode
$ npm run start:dev
```

## Reset the database

```bash
npm run db:reset
```

## License

Nest is [MIT licensed](LICENSE).

---

## Exercise 1 answers

We are missing quite a lot in terms of security:

- JWT are broken by conception (e.g. [Why JWTs Suck as Session Tokens](https://developer.okta.com/blog/2017/08/17/why-jwts-suck-as-session-tokens)) and implementation (e.g. [CVE-2018-1000531](https://nvd.nist.gov/vuln/detail/CVE-2018-1000531))
- There should be basic limitations about what could be used as email and passwords
- There is no `nonce` or similar non-replay token
- Passwords should be hashed client side, there is no valid reason for the server to receive the password in cleartext

To authenticate a JWT, the server has to verify that the payload (2nd part) matches the signature (3rd part).

Other existing authentication methods:

- Passwords
- Server-side sessions
- Client-side sessions (user here)
- Certificates
- Third-party sign in
- ...

## Exercise 2 answers

Files are sent over `Content-type: multipart/form-data` requests.

The endpoint does not make sure that the file is correct and safe before storing it, it merely checks the mimetype.
