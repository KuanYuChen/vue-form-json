import Helpers from 'mwangaben-vthelpers'
import VeeValidate from 'vee-validate'
import { mount, createLocalVue } from '@vue/test-utils'
import flatten from 'ramda/src/flatten'
import pickAll from 'ramda/src/pickAll'
import map from 'ramda/src/map'
import { slug } from '@/helpers'
import Form from '@/components/Form'
import fields from './fields'

const v = new VeeValidate.Validator()
const localVue = createLocalVue()
localVue.use(VeeValidate)
localVue.filter('slugify', str => slug(str))

let wrapper, b
const $inputSubmit = 'input[type=submit]'
const $reset = 'input[type=reset]'
const $inputFirstName = 'input[name=first-name]'
const $inputLastName = 'input[name=last-name]'
const $inputPassword = 'input[name=password]'
const $errorMessage = '.help.is-danger'
const $errorIcon = '.fa-exclamation-triangle'

const FORM_NAME = 'testFormName'
const DEFAULT_VALUE = 'test'
const EMAIL_VALUE = `${DEFAULT_VALUE}@aol.fr`
const RADIO_VALUE = 'Radio-One'
const NUMBER_VALUE = '18'
const ZIP_VALUE = '12345'
const PASSWORD_VALUE = ZIP_VALUE

const getInitialValue = (label, node, attribute) =>
  fields
    .find(field => field.label === label)[node]
    .filter(x => x[attribute])
    .map(({ value, text }) => value || text)

const COUNTRY_VALUE = getInitialValue('Country', 'options', 'selected')[0]
const CHECKBOX_VALUE = getInitialValue('Checkbox', 'items', 'checked')

const allFields = flatten(fields)
  .filter(field => !['html', 'slot'].includes(Object.keys(field)[0]))
const allNormalInputLabel = allFields
  .filter(x => !x.type || x.type === 'tel')
  .map(x => x.label)

const fieldWithPattern = allFields.find(({ pattern }) => pattern)

describe('Form', () => {
  beforeEach(() => {
    wrapper = mount(Form, {
      localVue,
      provide: () => ({
        $validator: v
      }),
      propsData: {
        formFields: fields,
        formName: FORM_NAME
      }
    })
    b = new Helpers(wrapper)
  })

  afterEach(() => {
    wrapper.destroy()
  })

  const fillForm = () => {
    allNormalInputLabel.forEach(x =>
      b.type(DEFAULT_VALUE, `input[name=${slug(x)}]`)
    )

    b.type(EMAIL_VALUE, 'input[name=email]')
    b.type(PASSWORD_VALUE, $inputPassword)
    b.type(NUMBER_VALUE, 'input[name=age]')
    b.type(ZIP_VALUE, 'input[name=zip]')
    b.type(DEFAULT_VALUE, 'textarea[name=message]')
  }

  const getFormValues = () => {
    let allValueFromNormalInput = pickAll(allNormalInputLabel, {})
    const setDefaultValue = obj => DEFAULT_VALUE
    allValueFromNormalInput = map(setDefaultValue, allValueFromNormalInput)

    return {
      ...allValueFromNormalInput,
      Password: PASSWORD_VALUE,
      Message: DEFAULT_VALUE,
      Checkbox: CHECKBOX_VALUE,
      Country: COUNTRY_VALUE,
      Email: EMAIL_VALUE,
      Radio: RADIO_VALUE,
      Age: NUMBER_VALUE,
      Zip: ZIP_VALUE
    }
  }

  it('is a Vue instance', () => {
    expect(wrapper.isVueInstance()).toBeTruthy()
  })

  it('have some props', () => {
    expect(wrapper.props().formFields).toBeTruthy()
    expect(wrapper.props().formName).toBeTruthy()
  })

  it('set input type text and required by default', () => {
    const LABEL_INPUT = 'testInput'
    const LABEL_INPUT_SLUGIFY = slug(LABEL_INPUT)
    wrapper.setProps({ formFields: [{ label: LABEL_INPUT }] })

    b.domHas(`input[name=${LABEL_INPUT_SLUGIFY}]`)
    b.domHas('input[type=text]')
    b.domHas(`input#${LABEL_INPUT_SLUGIFY}[required=required]`)
    b.see(LABEL_INPUT, `label[for=${LABEL_INPUT_SLUGIFY}].label p`)
    b.see(' *', 'sup.has-text-grey-light')
  })

  it('set not required', () => {
    const label = 'plop'
    wrapper.setProps({ formFields: [{ label, isRequired: false }] })

    b.domHasNot('.label sup.has-text-grey-light')
    b.domHasNot(`input#${label}[required=required]`)
    b.domHas(`input#${label}[aria-required=false]`)
  })

  it('hide label', () => {
    const label = 'plop'
    wrapper.setProps({ formFields: [{ label, showLabel: false }] })

    b.domHasNot('.label')
  })

  it('show fields', () => {
    b.domHas('.field-body .field .input')
    b.domHas('form > div > .field .input')
    b.domHas($inputSubmit)
  })

  it('have a help field', () => {
    b.domHas('.helpLabel')
  })

  it('hide error icon', () => {
    b.domHas($errorIcon)

    wrapper.setProps({ hasIcon: false })
    b.domHasNot($errorIcon)
  })

  it('have default properties', () => {
    b.hasAttribute('placeholder', 'Last Name placeholder', $inputLastName)
    b.hasAttribute('minlength', '3', $inputLastName)
    b.hasAttribute('min', '0', 'input[name=zip]')
    b.hasAttribute('min', '18', 'input[name=age]')
    b.hasAttribute('max', '99', 'input[name=age]')
    b.hasAttribute('pattern', fieldWithPattern.pattern, $inputPassword)
  })

  it('validate on blur', async () => {
    const isDanger = '.is-danger'

    b.domHas(`${$inputLastName}:not(${isDanger})`)

    b.type('la', $inputLastName, 'blur')
    await wrapper.vm.$nextTick()

    b.domHas(`${$inputLastName}${isDanger}`)
  })

  it('add pattern rule validation', async () => {
    wrapper.destroy()

    const passwordField = {
      label: 'Password',
      pattern: '^([0-9]+)$'
    }
    wrapper.setProps({ formFields: [passwordField] })
    await wrapper.vm.$nextTick()

    b.domHasNot($errorMessage)

    b.type(DEFAULT_VALUE, $inputPassword)
    await wrapper.vm.$nextTick()

    b.see('The Password field format is invalid.', $errorMessage)
    expect(wrapper.vm.isFormValid).toBeFalsy()

    b.type(PASSWORD_VALUE, $inputPassword)
    await wrapper.vm.$nextTick()

    b.domHasNot($errorMessage)
  })

  describe('custom css class', () => {
    it('apply custom classes', () => {
      const customClassInJson = flatten(fields).find(x => Object.keys(x).includes('parentClass')).parentClass
      const allCustomClass = wrapper.findAll(`.field.${customClassInJson.split(' ').join('.')}`)

      expect(allCustomClass).toHaveLength(1)
    })

    it('add customs class in json array', async () => {
      const Y_CLASS_NAME = 'yClass'
      const Z_CLASS_NAME = 'zClass'

      wrapper.setProps({
        formFields: [
          [
            { label: 'x' },
            { label: 'y', parentClass: Y_CLASS_NAME },
            { label: 'z', parentClass: Z_CLASS_NAME }
          ]
        ]
      })
      await wrapper.vm.$nextTick()

      b.domHas(`.field.${Y_CLASS_NAME}`)
      b.domHas(`.field.${Z_CLASS_NAME}`)

      const allY = wrapper.findAll(`.${Y_CLASS_NAME}`)
      expect(allY).toHaveLength(1)

      const allZ = wrapper.findAll(`.${Z_CLASS_NAME}`)
      expect(allZ).toHaveLength(1)
    })

    it('add custom class with classic json & slot', async () => {
      const LABEL_CLASS = 'labelClass'
      const SLOT_CLASS = 'slotClass'

      wrapper.setProps({
        formFields: [
          { label: 'label', parentClass: LABEL_CLASS },
          { slot: 'slotName', parentClass: SLOT_CLASS }
        ]
      })
      await wrapper.vm.$nextTick()

      b.domHas(`.field.${LABEL_CLASS} > .control input#label`)
      b.domHas(`.field.${SLOT_CLASS}`)
    })

    it('add custom class with json html content', async () => {
      const HTML_CLASS = 'htmlClass'
      const CONTENT_CLASS = 'custom-content'

      wrapper.setProps({
        formFields: [{
          html: `<p class=${CONTENT_CLASS}>content</p>`,
          parentClass: HTML_CLASS
        }]
      })
      await wrapper.vm.$nextTick()

      b.domHas(`.field.${HTML_CLASS} > .${CONTENT_CLASS}`)
    })
  })

  describe('slot', () => {
    const slotContainer = '[data-test=slot]'

    it('have no slot by default', async () => {
      wrapper.setProps({ formFields: [{ label: 'superLabel' }] })
      await wrapper.vm.$nextTick()

      b.domHasNot(slotContainer)
    })

    it('have a slot', () => {
      b.domHas(slotContainer)

      const allSlots = wrapper.findAll(slotContainer)
      expect(allSlots).toHaveLength(1)
    })
  })

  describe('default value', () => {
    it('set default value on radio', async () => {
      const inputSubmit = b.find($inputSubmit)
      const radioField = {
        label: 'Radio0',
        type: 'radio',
        items: [{ text: 'vRadioOne', checked: true }, 'vRadioTwo', 'vRadioThree']
      }

      wrapper.setProps({ formFields: [radioField] })
      await wrapper.vm.$nextTick()

      const radioValue = radioField.items[0].text
      b.inputValueIs(radioValue, `input[name=${slug(radioField.label)}]`)

      expect(wrapper.vm.isFormValid).toBeTruthy()
      expect(inputSubmit.attributes().disabled).toBe(undefined)
    })

    it('have default value', () => {
      b.inputValueIs('fir', $inputFirstName)
      b.inputValueIs('ZB', 'select[name=country]')
    })

    it('can have error on prefill input', () => {
      b.domHas(`${$inputFirstName}.is-danger`)
      b.see('The First Name field must be at least 4 characters.', $errorMessage)
    })
  })

  describe('submit', () => {
    it('have submit btn disabled', () => {
      const inputSubmit = b.find($inputSubmit)
      b.click('.checkbox')
      b.type(RADIO_VALUE, 'input[name=radio]', 'change')
      b.type(COUNTRY_VALUE, 'select[name=country]', 'change')
      expect(inputSubmit.attributes().disabled).toBe('disabled')
    })

    it('enable submit input if all fields are valid', () => {
      const inputSubmit = b.find($inputSubmit)
      expect(inputSubmit.attributes().disabled).toBe('disabled')

      fillForm()

      expect(wrapper.vm.isFormValid).toBeTruthy()
      expect(inputSubmit.attributes().disabled).toBe(undefined)
    })

    it('send an event formSubmitted with all values when submit', async () => {
      fillForm()
      await wrapper.vm.beforeSubmit()

      b.emittedContains('formSubmitted', {
        formName: FORM_NAME,
        values: getFormValues()
      })
    })
  })

  describe('reset', () => {
    it('reset values after submit', async () => {
      wrapper.setProps({ resetFormAfterSubmit: true })

      const resetFormStub = jest.fn()
      wrapper.setMethods({ resetForm: resetFormStub })

      fillForm()
      await wrapper.vm.beforeSubmit()

      expect(resetFormStub).toHaveBeenCalled()
    })

    it(`doesn't reset values after submit`, async () => {
      const resetFormStub = jest.fn()
      wrapper.setMethods({ resetForm: resetFormStub })

      fillForm()
      await wrapper.vm.beforeSubmit()

      expect(resetFormStub).not.toHaveBeenCalled()
    })

    it('have a btn to reset values', () => {
      b.domHas($reset)
      b.click($reset)
    })

    it('can reset value', () => {
      const resetFormStub = jest.fn()
      wrapper.setMethods({ resetForm: resetFormStub })

      b.click($reset)

      expect(resetFormStub).toHaveBeenCalled()
    })
  })
})
