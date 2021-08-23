const templates = [
  {
    name: 'RE-email-1',
    variant: 'Template1',
    inputs: [],
    template_type: 'Birthday',
    medium: 'Email',
    html: '<div>Happy Birthday To You!</div>',
    mjml: false,
  },
  {
    name: 'RE-email-1',
    variant: 'Template2',
    inputs: [],
    template_type: 'Birthday',
    medium: 'Email',
    html: `<mjml>
    <mj-body>
      <mj-section>
        <mj-column>
          <mj-text font-size="20px" color="#F45E43" font-family="helvetica">Hello World</mj-text>
        </mj-column>
      </mj-section>
    </mj-body>
  </mjml>`,
    mjml: true,
  },
]

module.exports = templates
