name: '📚 Documentation'
description: Are the docs lacking or missing something? Do they need some new 🔥 hotness? Tell us here.
body:

- type: dropdown
  id: kind
  attributes:
  label: 'Documentation Is:'
  options: - Missing - Needed - Confusing - Not Sure?
  validations:
  required: true
- type: textarea
  id: problem
  attributes:
  label: Please Explain in Detail...
  validations:
  required: true
- type: textarea
  id: solution
  attributes:
  label: Your Proposal for Changes
  validations:
  required: true
- type: textarea
  id: alternatives
  attributes:
  label: Alternatives considered
  description: Please provide a clear and concise description of any alternative solutions or features you've considered.