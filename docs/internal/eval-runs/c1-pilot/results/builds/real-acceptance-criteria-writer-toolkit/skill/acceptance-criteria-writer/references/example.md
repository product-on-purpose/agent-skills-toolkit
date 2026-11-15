# Worked example

Request: "Users can reset their password by email."

## Acceptance criteria

**AC-1** Given a registered user on the login page, When they submit their email on the reset form, Then a reset email is sent to that address.
**AC-2** Given a user with a valid reset link, When they submit a new password that meets the password policy, Then the password is changed and they can log in with it.
**AC-3** Given an email address that is not registered, When it is submitted on the reset form, Then the page shows the same confirmation message as for a registered address and no email is sent.
**AC-4** Given a reset link past its expiry, When the user opens it, Then the page shows that the link has expired and offers to request a new one.
**AC-5** Given a reset link that has already been used, When the user opens it again, Then the password is not changed and the page shows that the link is no longer valid.
**AC-6** Given a user submitting a new password that breaks the password policy, When they submit the form, Then the password is not changed and the rule that failed is shown.

## Open questions
- AC-4: how long is a reset link valid?
- AC-6: what is the password policy (minimum length, character rules)?

## Out of scope
- Resetting by SMS or security questions.
- Rate limiting of reset requests.
- Email design and wording.
