---
forms:
  - to: javadsajjadi24@gmail.com
    subject: New submission!
    redirect: /
    form_engine: netlify
    placeholders: true
    fields:
      - name: نام
        input_type: text
        placeholder: نام
        required: true
      - name: email
        input_type: email
        placeholder: Email address
        required: true
      - name: message
        input_type: textarea
        placeholder: Message
        required: false
      - name: submit
        input_type: submit
        placeholder: Submit form
        required: true
---

