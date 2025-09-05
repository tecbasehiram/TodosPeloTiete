/**
 *  Pages Authentication
 */
'use strict';

document.addEventListener('DOMContentLoaded', function () {
  (() => {
    const formAuthentication = document.querySelector('#formAuthentication');

    // Form validation for Add new record
    if (formAuthentication && typeof FormValidation !== 'undefined') {
      FormValidation.formValidation(formAuthentication, {
        fields: {
          username: {
            validators: {
              notEmpty: {
                message: 'Please enter username'
              },
              stringLength: {
                min: 5,
                message: 'Username must be more than 5 characters'
              }
            }
          },
          email: {
            validators: {
              notEmpty: {
                message: 'Please enter your email'
              },
              emailAddress: {
                message: 'Please enter a valid email address'
              }
            }
          },
          'email-username': {
            validators: {
              notEmpty: {
                message: 'Por favor insira seu usuário'
              },
              stringLength: {
                min: 5,
                message: 'O usuário precisa ter mais que 5 caracteres'
              }
            }
          },
          password: {
            validators: {
              notEmpty: {
                message: 'Por favor insira sua senha'
              },
              stringLength: {
                min: 5,
                message: 'A senha precisa ter mais que 5 caracteres'
              }
            }
          },
          'confirm-password': {
            validators: {
              notEmpty: {
                message: 'Por favor confirme a senha'
              },
              identical: {
                compare: () => formAuthentication.querySelector('[name="password"]').value,
                message: 'A senha e a confirmação da senha precisam ser iguais'
              },
              stringLength: {
                min: 5,
                message: 'A senha precisa ter mais que 5 caracteres'
              }
            }
          },
          terms: {
            validators: {
              notEmpty: {
                message: 'Please agree to terms & conditions'
              }
            }
          }
        },
        plugins: {
          trigger: new FormValidation.plugins.Trigger(),
          bootstrap5: new FormValidation.plugins.Bootstrap5({
            eleValidClass: '',
            rowSelector: '.form-control-validation'
          }),
          submitButton: new FormValidation.plugins.SubmitButton(),
          defaultSubmit: new FormValidation.plugins.DefaultSubmit(),
          autoFocus: new FormValidation.plugins.AutoFocus()
        },
        init: instance => {
          instance.on('plugins.message.placed', e => {
            if (e.element.parentElement.classList.contains('input-group')) {
              e.element.parentElement.insertAdjacentElement('afterend', e.messageElement);
            }
          });
        }
      });
    }

    // Two Steps Verification for numeral input mask
    const numeralMaskElements = document.querySelectorAll('.numeral-mask');

    // Format function for numeral mask
    const formatNumeral = value => value.replace(/\D/g, ''); // Only keep digits

    if (numeralMaskElements.length > 0) {
      numeralMaskElements.forEach(numeralMaskEl => {
        numeralMaskEl.addEventListener('input', event => {
          numeralMaskEl.value = formatNumeral(event.target.value);
        });
      });
    }
  })();
});
