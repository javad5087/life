---
title: "تماس"
layout: "form"
forms:
  - to: javadsajjadi24@gmail.com
    subject: New submission!
    redirect: /
    form_engine: netlify
    placeholders: false
    fields: 
      - name: name
        input_type: text
        placeholder: نام
        required: true
      - name: email
        input_type: email
        placeholder: آدرس ایمیل
        required: true
      - name: sex
        input_type: radio
        placeholder: مرد
        required: true
      - name: sex
        input_type: radio
        placeholder: زن
        required: true
      - name: message
        input_type: textarea
        placeholder: پیام
        required: false
      - name: terms
        input_type: checkbox
        placeholder: کمتر از ٢٤ ساءت به شما جواب داده خواهد شد
        required: true
      - name: submit
        input_type: submit
        placeholder: ارسال
        required: true
---
