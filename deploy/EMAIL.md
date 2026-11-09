# System email

All system messages use the authenticated custom mailbox as their From address.
Staff invitations, password resets, booking receipts and contact acknowledgements
share `utils/sendEmail.js`.

Configure these in the server's environment (the password is the mailbox's actual
password, not a Gmail app password):

```dotenv
SMTP_HOST=mail.privateemail.com
SMTP_PORT=587
SMTP_USER=contact@vistavillaapartments.org
SMTP_PASSWORD=your-custom-mailbox-password
CONTACT_EMAIL=contact@vistavillaapartments.org
```

Port 587 uses required STARTTLS. Port 465 uses implicit TLS. Certificate validation
remains enabled. Legacy lowercase `smtp_*` Gmail settings are no longer used.
Contact forms send to CONTACT_EMAIL and set the visitor as Reply-To; no caller
can override the authenticated sender.

Deploy and restart `vistavilla` after updating the server environment. The .env
file is ignored by Git, so local changes will not arrive through a Git pull.
If systemd supplies SMTP_* values directly, update those too; process environment
values take precedence over dotenv. EAUTH still requires correcting mailbox
credentials or provider access; changing application code cannot fix an invalid
mailbox password. No real email was sent during the automated tests.
